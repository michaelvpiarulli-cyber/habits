/**
 * Key-protected program API used by JENO. Same TALLY_INGEST_KEY as /api/ingest.
 * Writes program_workouts under the household id and records a JENO inbox row.
 */

import { createClient } from '@supabase/supabase-js';
import { extractIngestKey, keysMatch } from './ingest.js';
import { HOUSEHOLD_OWNER_ID } from './household.js';
import {
  applyProgramAction,
  isUuid,
  normalizeWorkout,
  visibleWorkouts,
} from './program.js';

const DEFAULT_URL = 'https://amrqzdnsbgoqkckcytjq.supabase.co';

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

function rowFromDb(row) {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    days: row.days || [],
    pattern: row.pattern || 'weekly',
    dates: (row.dates || []).map((day) => String(day).slice(0, 10)),
    startTime: row.start_time || '',
    endTime: row.end_time || '',
    exercises: Array.isArray(row.exercises) ? row.exercises : [],
    sortOrder: row.sort_order || 0,
    deleted: !!row.deleted,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToDb(workout, ownerId) {
  return {
    id: workout.id,
    user_id: ownerId,
    name: workout.name,
    kind: workout.kind,
    days: workout.days || [],
    pattern: workout.pattern || 'weekly',
    dates: workout.dates || [],
    start_time: workout.startTime || '',
    end_time: workout.endTime || '',
    exercises: workout.exercises || [],
    sort_order: workout.sortOrder || 0,
    deleted: !!workout.deleted,
    created_at: workout.createdAt,
    updated_at: workout.updatedAt,
  };
}

export function supabaseProgramStore(env, clientFactory = createClient) {
  const url = env.SUPABASE_URL || DEFAULT_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    const error = new Error('Ingest is not configured.');
    error.status = 503;
    throw error;
  }
  const client = clientFactory(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return {
    async get() {
      const [meta, rows] = await Promise.all([
        client.from('training_program').select('adopted').eq('user_id', HOUSEHOLD_OWNER_ID).maybeSingle(),
        client.from('program_workouts').select('*').eq('user_id', HOUSEHOLD_OWNER_ID),
      ]);
      if (meta.error && isMissingTable(meta.error)) {
        const error = new Error('Program tables are missing. Run supabase/add-jeno-program.sql.');
        error.status = 503;
        error.missing = true;
        throw error;
      }
      if (meta.error) throw meta.error;
      if (rows.error && isMissingTable(rows.error)) {
        const error = new Error('Program tables are missing. Run supabase/add-jeno-program.sql.');
        error.status = 503;
        error.missing = true;
        throw error;
      }
      if (rows.error) throw rows.error;
      return {
        adopted: Boolean(meta.data?.adopted),
        workouts: (rows.data || []).map(rowFromDb),
      };
    },
    async save(state) {
      const now = new Date().toISOString();
      const meta = await client.from('training_program').upsert({
        user_id: HOUSEHOLD_OWNER_ID,
        adopted: Boolean(state.adopted),
        updated_at: now,
      });
      if (meta.error) throw meta.error;
      if (!state.workouts?.length) return;
      const { error } = await client
        .from('program_workouts')
        .upsert(state.workouts.map((workout) => rowToDb(workout, HOUSEHOLD_OWNER_ID)));
      if (error) throw error;
    },
    async log(entry) {
      const { error } = await client.from('jeno_activity').insert({
        id: crypto.randomUUID(),
        user_id: HOUSEHOLD_OWNER_ID,
        kind: 'workout',
        action: entry.action,
        summary: entry.summary,
        detail: entry.detail || {},
        day: null,
        created_at: new Date().toISOString(),
      });
      if (error && !isMissingTable(error)) throw error;
    },
  };
}

function authorize(headers, env) {
  const expected = env.TALLY_INGEST_KEY || '';
  if (!expected) return { status: 503, body: { error: 'Ingest is not configured.' } };
  if (!keysMatch(extractIngestKey(headers), expected)) {
    return { status: 401, body: { error: 'Unauthorized' } };
  }
  return null;
}

export async function runProgram({ method, headers, body, query = {}, env = {}, store }) {
  if (method === 'OPTIONS') return { status: 204, body: null };
  const denied = authorize(headers, env);
  if (denied) return denied;

  const verb = String(method || '').toUpperCase();
  if (!['GET', 'POST', 'PATCH', 'PUT', 'DELETE'].includes(verb)) {
    return { status: 405, body: { error: 'Method not allowed' } };
  }

  let active;
  try {
    active = store || supabaseProgramStore(env);
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
