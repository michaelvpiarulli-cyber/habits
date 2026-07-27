import { createClient } from '@supabase/supabase-js';

/**
 * Both values are public by design: the publishable key is meant to ship in the
 * browser bundle, and row-level security (see supabase/schema.sql) is what
 * actually protects each user's data — not secrecy of this key.
 *
 * Copy .env.example to .env.local to fill them in, and add the same two
 * variables in Vercel under Project Settings → Environment Variables.
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * With no keys the app still runs — it just stays on the device: no login, no
 * sync, everything in localStorage. That keeps `npm run dev` useful before the
 * Supabase project exists.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = isSupabaseConfigured ? createClient(url, anonKey) : null;
