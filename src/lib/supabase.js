import { Capacitor } from '@capacitor/core';
import { createClient } from '@supabase/supabase-js';
import { createAuthOptions } from './authGate';

/**
 * Habits / Tally Supabase project. The publishable key is public by design —
 * it only identifies the project. Row access requires a signed-in owner
 * (see supabase/lock-owner-rls.sql). The service-role key never belongs here.
 *
 * These defaults win over stale Vercel env that still pointed at the Bible app
 * project. Env vars are only used when they already target this Habits project.
 */
const HABITS_URL = 'https://amrqzdnsbgoqkckcytjq.supabase.co';
const HABITS_ANON_KEY = 'sb_publishable__NKtri3G-26DlHkv-ZmQ7g_BP0rX698';

const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const envIsHabits = typeof envUrl === 'string' && envUrl.includes('amrqzdnsbgoqkckcytjq');

const url = envIsHabits && envUrl ? envUrl : HABITS_URL;
const anonKey = envIsHabits && envKey ? envKey : HABITS_ANON_KEY;

/**
 * With no keys the app still runs — it just stays on the device: no login, no
 * sync, everything in localStorage. That keeps `npm run dev` useful before the
 * Supabase project exists. The shipped defaults above set both, so the Habits
 * build asks for a sign-in.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

function nativeShell() {
  try {
    return typeof window !== 'undefined' && Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, { auth: createAuthOptions({ native: nativeShell() }) })
  : null;
