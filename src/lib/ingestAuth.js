/**
 * Authorize /api/ingest and /api/program.
 * TALLY_INGEST_KEY still works when it is set. Otherwise the presented key
 * is hashed and compared with app_secrets.ingest_key.
 */

import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { extractIngestKey, keysMatch } from './ingest.js';

const DEFAULT_URL = 'https://amrqzdnsbgoqkckcytjq.supabase.co';
const PUBLISHABLE_KEY = 'sb_publishable__NKtri3G-26DlHkv-ZmQ7g_BP0rX698';
const MISMATCH = '0'.repeat(64);

export function sha256Hex(value) {
  return createHash('sha256').update(String(value), 'utf8').digest('hex');
}

function clientFor(url, key) {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function hashFromServiceRole(env) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  const url = env.SUPABASE_URL || DEFAULT_URL;
  const { data, error } = await clientFor(url, key)
    .from('app_secrets')
    .select('value_sha256')
    .eq('name', 'ingest_key')
    .maybeSingle();
  if (error || !data?.value_sha256) return null;
  return String(data.value_sha256).trim().toLowerCase();
}

async function hashFromRpc(env, provided) {
  const url = env.SUPABASE_URL || DEFAULT_URL;
  const key = env.SUPABASE_ANON_KEY || PUBLISHABLE_KEY;
  const { data, error } = await clientFor(url, key).rpc('check_ingest_key', { candidate: provided });
  if (error) {
    const err = new Error('Ingest is not configured.');
    err.status = 503;
    throw err;
  }
  return data === true ? sha256Hex(provided) : MISMATCH;
}

export async function fetchStoredHash(env = {}, provided = '') {
  const fromRole = await hashFromServiceRole(env);
  if (fromRole) return fromRole;
  return hashFromRpc(env, provided);
}

export async function authorizeIngest({ headers, env = {}, lookupHash } = {}) {
  const provided = extractIngestKey(headers);
  if (!provided) return { status: 401, body: { error: 'Unauthorized' } };

  const envKey = String(env.TALLY_INGEST_KEY || '');
  if (envKey && keysMatch(provided, envKey)) return null;

  if (envKey && typeof lookupHash !== 'function') {
    return { status: 401, body: { error: 'Unauthorized' } };
  }

  let stored;
  try {
    stored = typeof lookupHash === 'function' ? await lookupHash() : await fetchStoredHash(env, provided);
  } catch (err) {
    return { status: err.status || 503, body: { error: 'Ingest is not configured.' } };
  }
  if (!stored) return { status: 503, body: { error: 'Ingest is not configured.' } };
  if (keysMatch(sha256Hex(provided), String(stored).trim().toLowerCase())) return null;
  return { status: 401, body: { error: 'Unauthorized' } };
}
