/**
 * Pull a public MyFitnessPal diary into daily_nutrition rows with source mfp.
 * JENO rows (source jeno) are never updated.
 */

import { createClient } from '@supabase/supabase-js';
import { HOUSEHOLD_OWNER_ID } from './household.js';
import {
  MFP_SETUP_MESSAGE,
  MFP_STATUS,
  addIsoDays,
  fetchMfpDiary,
  laToday,
  normalizeUsername,
} from './mfpDiary.js';

const DEFAULT_URL = 'https://amrqzdnsbgoqkckcytjq.supabase.co';

function isMissingTable(error) {
  return error?.code === 'PGRST205' || error?.code === 'PGRST106' || error?.code === '42P01';
}

export function syncWindow(now = new Date(), backfillDone = false) {
  const today = laToday(now);
  return {
    today,
    from: addIsoDays(today, backfillDone ? -1 : -13),
    to: today,
  };
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

function cronRequest(headers = {}, env = {}) {
  const bag = {};
  for (const [key, value] of Object.entries(headers)) bag[String(key).toLowerCase()] = String(value || '');
  const secret = env.CRON_SECRET || '';
  const header = bag.authorization || '';
  const bearer = header.match(/^Bearer\s+(.+)$/i);
  if (secret && bearer && bearer[1].trim() === secret) return true;
  return String(bag['user-agent'] || '').toLowerCase().startsWith('vercel-cron');
}

export function supabaseMfpStore(env, clientFactory = createClient) {
  const url = env.SUPABASE_URL || DEFAULT_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    const error = new Error('MyFitnessPal sync is not configured.');
    error.status = 503;
    throw error;
  }
  const client = clientFactory(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return {
    async getSettings() {
      const { data, error } = await client
        .from('mfp_sync')
        .select('username, last_synced_at, last_status, last_error, backfill_done')
        .eq('user_id', HOUSEHOLD_OWNER_ID)
        .maybeSingle();
      if (error && isMissingTable(error)) return { username: '', backfillDone: false, missing: true };
      if (error) throw error;
      return {
        username: data?.username || '',
        lastSyncedAt: data?.last_synced_at || null,
        lastStatus: data?.last_status || '',
        lastError: data?.last_error || '',
        backfillDone: Boolean(data?.backfill_done),
      };
    },
    async saveSettings(patch) {
      const now = new Date().toISOString();
      const row = {
        user_id: HOUSEHOLD_OWNER_ID,
        updated_at: now,
      };
      if (patch.username != null) row.username = patch.username;
      if (patch.lastSyncedAt !== undefined) row.last_synced_at = patch.lastSyncedAt;
      if (patch.lastStatus != null) row.last_status = patch.lastStatus;
      if (patch.lastError != null) row.last_error = patch.lastError;
      if (patch.backfillDone != null) row.backfill_done = patch.backfillDone;
      const { error } = await client.from('mfp_sync').upsert(row);
      if (error && !isMissingTable(error)) throw error;
    },
    async getNutrition(day, source) {
      const { data, error } = await client
        .from('daily_nutrition')
        .select('id, meals, calories, protein, carbs, fat, source')
        .eq('user_id', HOUSEHOLD_OWNER_ID)
        .eq('day', day)
        .eq('source', source)
        .eq('deleted', false)
        .maybeSingle();
      if (error) throw error;
      return data || null;
    },
    async saveNutrition(row) {
      const { error } = await client.from('daily_nutrition').upsert(row);
      if (error) throw error;
    },
  };
}

export async function runMfpSync({
  method = 'POST',
  headers = {},
  body,
  env = {},
  store,
  fetchImpl = fetch,
  now = new Date(),
} = {}) {
  const verb = String(method || 'POST').toUpperCase();
  if (verb === 'OPTIONS') return { status: 204, body: null };
  if (!['GET', 'POST'].includes(verb)) return { status: 405, body: { error: 'Method not allowed' } };
  if (verb === 'GET' && !cronRequest(headers, env)) {
    return { status: 401, body: { error: 'Unauthorized' } };
  }

  let active;
  try {
    active = store || supabaseMfpStore(env);
  } catch (err) {
    return { status: err.status || 503, body: { error: err.message || 'MyFitnessPal sync is not configured.' } };
  }

  const parsedBody = verb === 'POST' ? readBody(body) : {};
  if (parsedBody?.error) return { status: 400, body: { error: parsedBody.error } };

  const settings = await active.getSettings();
  const requested = parsedBody.username != null ? parsedBody.username : (env.MFP_USERNAME || settings.username || '');
  const username = normalizeUsername(requested);
  if (username?.error) return { status: 400, body: { error: username.error, status: MFP_STATUS.error } };
  if (!username) {
    await active.saveSettings({ username: '', lastStatus: MFP_STATUS.setup, lastError: '', backfillDone: false });
    return { status: 200, body: { ok: false, status: MFP_STATUS.setup, message: MFP_SETUP_MESSAGE, days: [] } };
  }

  const usernameChanged = username !== (settings.username || '');
  const backfillDone = usernameChanged ? false : Boolean(settings.backfillDone);
  const window = syncWindow(now, backfillDone);

  let diary;
  try {
    diary = await fetchMfpDiary(username, window.from, window.to, fetchImpl);
  } catch {
    const message = 'Could not reach MyFitnessPal.';
    await active.saveSettings({
      username,
      lastStatus: MFP_STATUS.error,
      lastError: message,
      backfillDone,
    });
    return { status: 200, body: { ok: false, status: MFP_STATUS.error, message, days: [] } };
  }

  if (diary.status !== MFP_STATUS.ok) {
    await active.saveSettings({
      username,
      lastStatus: diary.status,
      lastError: diary.message,
      backfillDone,
    });
    return { status: 200, body: { ok: false, status: diary.status, message: diary.message, days: [] } };
  }

  const stamp = now.toISOString();
  const saved = [];
  for (const day of diary.days) {
    const existing = await active.getNutrition(day.date, 'mfp');
    const jeno = await active.getNutrition(day.date, 'jeno');
    await active.saveNutrition({
      id: existing?.id || crypto.randomUUID(),
      user_id: HOUSEHOLD_OWNER_ID,
      day: day.date,
      source: 'mfp',
      calories: day.totals.calories,
      protein: day.totals.protein,
      carbs: day.totals.carbs,
      fat: day.totals.fat,
      meals: day.meals,
      deleted: false,
      updated_at: stamp,
      ...(existing ? {} : { created_at: stamp }),
    });
    saved.push({
      date: day.date,
      calories: day.totals.calories,
      protein: day.totals.protein,
      jenoUntouched: jeno?.id || null,
    });
  }

  await active.saveSettings({
    username,
    lastStatus: MFP_STATUS.ok,
    lastError: '',
    lastSyncedAt: stamp,
    backfillDone: true,
  });

  return {
    status: 200,
    body: {
      ok: true,
      status: MFP_STATUS.ok,
      message: '',
      syncedAt: stamp,
      from: window.from,
      to: window.to,
      days: saved,
    },
  };
}
