/**
 * Server-side Life OS ingest. Checks TALLY_INGEST_KEY, then writes rows under
 * the shared household id. The caller cannot choose user_id. No login and no
 * app_owner row are required.
 */

import { createClient } from '@supabase/supabase-js';
import { extractIngestKey, keysMatch, validateIngest } from './ingest.js';
import { HOUSEHOLD_OWNER_ID } from './household.js';

const DEFAULT_URL = 'https://amrqzdnsbgoqkckcytjq.supabase.co';

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

async function writeNutrition(client, ownerId, value) {
  const now = new Date().toISOString();
  const { data: existing, error: readError } = await client
    .from('daily_nutrition')
    .select('id')
    .eq('user_id', ownerId)
    .eq('day', value.date)
    .eq('deleted', false)
    .maybeSingle();
  if (readError) throw readError;

  const row = {
    id: existing?.id || crypto.randomUUID(),
    user_id: ownerId,
    day: value.date,
    calories: value.calories,
    protein: value.protein,
    carbs: value.carbs,
    fat: value.fat,
    meals: value.meals,
    deleted: false,
    updated_at: now,
    ...(existing ? {} : { created_at: now }),
  };
  const { error } = await client.from('daily_nutrition').upsert(row);
  if (error) throw error;

  const proteinHabitId = await syncProteinHabit(client, ownerId, value.date, value.protein, now);
  return { ok: true, kind: 'nutrition', day: value.date, proteinHabitId };
}

async function syncProteinHabit(client, ownerId, day, protein, now) {
  const { data: habits, error } = await client
    .from('habits')
    .select('id, name, archived, deleted')
    .eq('user_id', ownerId)
    .eq('deleted', false);
  if (error) throw error;
  const habit = (habits || []).find((row) => !row.archived && /protein/i.test(row.name || ''));
  if (!habit) return null;

  const { data: logs, error: logError } = await client
    .from('habit_logs')
    .select('id')
    .eq('user_id', ownerId)
    .eq('habit_id', habit.id)
    .eq('day', day)
    .eq('deleted', false)
    .limit(1);
  if (logError) throw logError;

  if (logs?.[0]) {
    const { error: updateError } = await client
      .from('habit_logs')
      .update({ amount: protein, deleted: false, updated_at: now })
      .eq('id', logs[0].id);
    if (updateError) throw updateError;
    return habit.id;
  }
  if (!(protein > 0)) return habit.id;

  const { error: insertError } = await client.from('habit_logs').insert({
    id: crypto.randomUUID(),
    user_id: ownerId,
    habit_id: habit.id,
    day,
    amount: protein,
    deleted: false,
    created_at: now,
    updated_at: now,
  });
  if (insertError) throw insertError;
  return habit.id;
}

async function writeWorkout(client, ownerId, value) {
  const now = new Date().toISOString();
  const { data: existing, error: readError } = await client
    .from('workout_logs')
    .select('id')
    .eq('user_id', ownerId)
    .eq('day', value.date)
    .eq('deleted', false)
    .maybeSingle();
  if (readError) throw readError;

  const row = {
    id: existing?.id || crypto.randomUUID(),
    user_id: ownerId,
    day: value.date,
    plan_id: value.planId,
    done: value.done,
    deleted: false,
    updated_at: now,
    ...(existing ? {} : { created_at: now }),
  };
  const { error } = await client.from('workout_logs').upsert(row);
  if (error) throw error;
  return { ok: true, kind: 'workout', day: value.date, planId: value.planId, done: value.done };
}

export function supabaseIngestStore(env, clientFactory = createClient) {
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
    write(ownerId, value) {
      if (value.kind === 'nutrition') return writeNutrition(client, ownerId, value);
      return writeWorkout(client, ownerId, value);
    },
  };
}

export async function runIngest({ method, headers, body, env = {}, store }) {
  if (method === 'OPTIONS') return { status: 204, body: null };
  if (method !== 'POST') return { status: 405, body: { error: 'Method not allowed' } };

  const expected = env.TALLY_INGEST_KEY || '';
  if (!expected) return { status: 503, body: { error: 'Ingest is not configured.' } };
  if (!keysMatch(extractIngestKey(headers), expected)) {
    return { status: 401, body: { error: 'Unauthorized' } };
  }

  const parsedBody = readBody(body);
  if (parsedBody?.error && !parsedBody.kind) {
    return { status: 400, body: { error: parsedBody.error } };
  }
  const validated = validateIngest(parsedBody);
  if (!validated.ok) return { status: validated.status, body: { error: validated.error } };

  try {
    const active = store || supabaseIngestStore(env);
    const result = await active.write(HOUSEHOLD_OWNER_ID, validated.value);
    return { status: 200, body: result };
  } catch (err) {
    const status = err.status || 502;
    return { status, body: { error: err.message || 'Ingest failed' } };
  }
}
