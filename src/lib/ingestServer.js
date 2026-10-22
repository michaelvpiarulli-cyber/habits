/**
 * Server-side Life OS ingest. Checks TALLY_INGEST_KEY, then writes rows under
 * the shared household id. The caller cannot choose user_id. No login and no
 * app_owner row are required.
 */

import { applyNutritionWrite, foodCount } from './foodLog.js';
import { anonIngestClient, authorizeIngest, authorizeSteps, ingestRpcError } from './ingestAuth.js';
import { extractIngestKey, validateIngest } from './ingest.js';
import { HOUSEHOLD_OWNER_ID } from './household.js';

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

async function writeNutrition(client, key, value) {
  const { data: existing, error: readError } = await client.rpc('ingest_nutrition', {
    p_key: key,
    p_day: value.date,
    p_write: null,
  });
  if (readError) throw ingestRpcError(readError);

  const next = applyNutritionWrite(existing, value);
  const count = foodCount(next);
  const { data, error } = await client.rpc('ingest_nutrition', {
    p_key: key,
    p_day: value.date,
    p_write: {
      id: existing?.id || null,
      calories: next.calories,
      protein: next.protein,
      carbs: next.carbs,
      fat: next.fat,
      meals: next.meals,
      summary: `Food for ${value.date} · ${Math.round(next.calories)} kcal · ${Math.round(next.protein)} g protein${count ? ` · ${count} foods` : ''}`,
      detail: { meals: next.meals, calories: next.calories, protein: next.protein },
    },
  });
  if (error) throw ingestRpcError(error);
  return data;
}

async function writeSteps(client, key, value) {
  const { data, error } = await client.rpc('ingest_steps', {
    p_key: key,
    p_day: value.date,
    p_steps: value.steps,
  });
  if (error) throw ingestRpcError(error);
  return data;
}

async function writeWorkout(client, key, value) {
  const { data, error } = await client.rpc('ingest_workout', {
    p_key: key,
    p_day: value.date,
    p_plan_id: value.planId,
    p_done: value.done,
  });
  if (error) throw ingestRpcError(error);
  return data;
}

export function supabaseIngestStore(env, ingestKey, clientFactory) {
  const client = anonIngestClient(env, clientFactory);
  const key = String(ingestKey || '');
  return {
    write(_ownerId, value) {
      if (value.kind === 'nutrition') return writeNutrition(client, key, value);
      if (value.kind === 'steps') return writeSteps(client, key, value);
      return writeWorkout(client, key, value);
    },
  };
}

export async function runIngest({ method, headers, body, env = {}, store, lookupHash, lookupStepsHash, clientFactory }) {
  if (method === 'OPTIONS') return { status: 204, body: null };
  if (method !== 'POST') return { status: 405, body: { error: 'Method not allowed' } };
  if (!extractIngestKey(headers)) return { status: 401, body: { error: 'Unauthorized' } };

  const parsedBody = readBody(body);
  if (parsedBody?.error && !parsedBody.kind) {
    return { status: 400, body: { error: parsedBody.error } };
  }

  const denied = parsedBody?.kind === 'steps'
    ? await authorizeSteps({ headers, env, lookupHash: lookupStepsHash })
    : await authorizeIngest({ headers, env, lookupHash });
  if (denied) return denied;

  const validated = validateIngest(parsedBody);
  if (!validated.ok) return { status: validated.status, body: { error: validated.error } };

  try {
    const active = store || supabaseIngestStore(env, extractIngestKey(headers), clientFactory);
    const result = await active.write(HOUSEHOLD_OWNER_ID, validated.value);
    return { status: 200, body: result };
  } catch (err) {
    const status = err.status || 502;
    return { status, body: { error: err.message || 'Ingest failed' } };
  }
}
