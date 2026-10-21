/**
 * Key-protected program API used by JENO. Same TALLY_INGEST_KEY as /api/ingest.
 * Writes program_workouts under the household id and records a JENO inbox row.
 */

import { anonIngestClient, authorizeIngest, ingestRpcError } from './ingestAuth.js';
import { extractIngestKey } from './ingest.js';
import {
  applyProgramAction,
  isUuid,
  normalizeWorkout,
  visibleWorkouts,
} from './program.js';

function isMissingTable(error) {
  return error?.code === 'PGRST205' || error?.code === 'PGRST106' || error?.code === '42P01';
}

function readBody(body) {
  if (body == null || body === '') return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return { error: 'Expected JSON.' };
    }
  }
  return body;
}

function stampWorkout(raw, now, { id } = {}) {
  const parsed = normalizeWorkout(raw);
  if (parsed.error) return parsed;
  const chosen = raw?.id || id;
  if (raw?.id && !isUuid(raw.id)) return { error: 'id must be a uuid.' };
  return {
    value: {
      id: chosen || crypto.randomUUID(),
      ...parsed.value,
      deleted: false,
      createdAt: raw?.createdAt || now,
      updatedAt: now,
    },
  };
}

export function supabaseProgramStore(env, ingestKey, clientFactory) {
  const client = anonIngestClient(env, clientFactory);
  const key = String(ingestKey || '');

  async function upsert(state, activity) {
    const { error } = await client.rpc('program_upsert', {
      p_key: key,
      p_adopted: Boolean(state?.adopted),
      p_workouts: state ? state.workouts || [] : null,
      p_activity: activity,
    });
    if (error) throw ingestRpcError(error);
  }

  return {
    async get() {
      const { data, error } = await client.rpc('program_get', { p_key: key });
      if (error) {
        const wrapped = ingestRpcError(error);
        if (isMissingTable(error)) {
          wrapped.missing = true;
          wrapped.status = 503;
        }
        throw wrapped;
      }
      return {
        adopted: Boolean(data?.adopted),
        workouts: Array.isArray(data?.workouts) ? data.workouts : [],
      };
    },
    async save(state) {
      if (!state?.workouts?.length && !state?.adopted) return;
      await upsert(state, null);
    },
    async log(entry) {
      await upsert(null, {
        id: crypto.randomUUID(),
        kind: 'workout',
        action: entry.action,
        summary: entry.summary,
        detail: entry.detail || {},
        day: null,
      });
    },
  };
}

export async function runProgram({ method, headers, body, query = {}, env = {}, store, lookupHash, clientFactory }) {
  if (method === 'OPTIONS') return { status: 204, body: null };
  const denied = await authorizeIngest({ headers, env, lookupHash });
  if (denied) return denied;

  const verb = String(method || '').toUpperCase();
  if (!['GET', 'POST', 'PATCH', 'PUT', 'DELETE'].includes(verb)) {
    return { status: 405, body: { error: 'Method not allowed' } };
  }

  let active;
  try {
    active = store || supabaseProgramStore(env, extractIngestKey(headers), clientFactory);
  } catch (err) {
    return { status: err.status || 503, body: { error: err.message || 'Ingest is not configured.' } };
  }

  try {
    const state = await active.get();
    if (verb === 'GET') {
      const visible = visibleWorkouts(state);
      return { status: 200, body: { ok: true, ...visible } };
    }

    const parsed = readBody(body);
    if (parsed?.error && !parsed.name && !parsed.id && !parsed.workouts) {
      return { status: 400, body: { error: parsed.error } };
    }
    const now = new Date().toISOString();
    let action;

    if (verb === 'POST') {
      const workout = stampWorkout(parsed.workout || parsed, now);
      if (workout.error) return { status: 400, body: { error: workout.error } };
      action = { type: 'create', workout: workout.value };
    } else if (verb === 'PATCH') {
      const id = parsed.id || query.id;
      if (!isUuid(id)) return { status: 400, body: { error: 'id must be a uuid.' } };
      const current = (state.adopted ? state.workouts : visibleWorkouts(state).workouts).find(
        (workout) => workout.id === id && !workout.deleted
      );
      if (!current) return { status: 404, body: { error: 'Workout not found.' } };
      const workout = stampWorkout({ ...current, ...(parsed.workout || parsed), id }, now, { id });
      if (workout.error) return { status: 400, body: { error: workout.error } };
      action = { type: 'update', id, patch: workout.value };
    } else if (verb === 'DELETE') {
      const id = parsed.id || query.id;
      if (!isUuid(id)) return { status: 400, body: { error: 'id must be a uuid.' } };
      action = { type: 'delete', id };
    } else {
      const list = parsed.workouts;
      if (!Array.isArray(list)) return { status: 400, body: { error: 'workouts must be a list.' } };
      if (list.length > 21) return { status: 400, body: { error: 'Too many workouts.' } };
      const workouts = [];
      for (const [index, item] of list.entries()) {
        const workout = stampWorkout({ ...item, sortOrder: item?.sortOrder ?? index }, now);
        if (workout.error) return { status: 400, body: { error: workout.error } };
        workouts.push(workout.value);
      }
      action = { type: 'replace', workouts };
    }

    const result = applyProgramAction(state, action);
    if (result.error) return { status: result.status || 400, body: { error: result.error } };
    await active.save(result.state);
    if (result.activity) await active.log(result.activity);
    const visible = visibleWorkouts(result.state);
    return {
      status: 200,
      body: {
        ok: true,
        adopted: true,
        source: 'jeno',
        workouts: visible.workouts,
        activity: result.activity,
      },
    };
  } catch (err) {
    if (err.missing && verb === 'GET') {
      const visible = visibleWorkouts({ adopted: false });
      return { status: 200, body: { ok: true, ...visible, warning: err.message } };
    }
    const status = err.status || 502;
    return { status, body: { error: err.message || 'Program update failed' } };
  }
}
