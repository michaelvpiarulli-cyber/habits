import { createClient } from '@supabase/supabase-js';

/**
 * Habits / Tally Supabase project. The publishable key is public by design —
 * row-level security (see supabase/schema.sql) protects each user's data.
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
 * Supabase project exists.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = isSupabaseConfigured ? createClient(url, anonKey) : null;
