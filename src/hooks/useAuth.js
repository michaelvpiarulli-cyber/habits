import { useCallback, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Wraps Supabase auth. Without configured keys it reports a stable
 * "signed out, unavailable" state so the app runs in local-only mode.
 *
 * Sign-in takes a USERNAME, not an email. Supabase auth is email-keyed, so a
 * bare username is mapped onto an internal address the user never types or
 * sees. This is a single-person app; asking for an email only to prove you own
 * it is ceremony that buys nothing, and account-recovery-by-email is not worth
 * the friction when the data also lives on the device.
 *
 * Anything containing "@" is passed straight through, so a real email still
 * works — including an account created for another app on the same project.
 */
const INTERNAL_DOMAIN = 'tally.app';

export function toEmail(identifier) {
  const id = identifier.trim();
  return id.includes('@') ? id.toLowerCase() : `${id.toLowerCase()}@${INTERNAL_DOMAIN}`;
}
export function useAuth() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (username, password) => {
    if (!isSupabaseConfigured) return { error: 'Sync is not set up yet.' };
    const { error } = await supabase.auth.signInWithPassword({
      email: toEmail(username),
      password,
    });
    if (!error) return { error: null };
    // Supabase phrases these around email, which would be baffling on a screen
    // that never asked for one.
    if (/email not confirmed/i.test(error.message)) {
      return { error: 'This account still needs confirming. Turn off “Confirm email” in Supabase.' };
    }
    if (/invalid login credentials/i.test(error.message)) {
      return { error: 'That username and password don’t match an account.' };
    }
    return { error: error.message };
  }, []);

  const signUp = useCallback(async (username, password) => {
    if (!isSupabaseConfigured) return { error: 'Sync is not set up yet.' };
    const { data, error } = await supabase.auth.signUp({
      email: toEmail(username),
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      if (/already registered/i.test(error.message)) {
        return { error: 'That username is taken. Sign in instead, or pick another.' };
      }
      return { error: error.message };
    }
    // A user with no session means the project still requires confirmation —
    // which can never arrive at an internal address, so say so plainly instead
    // of telling someone to check an inbox that will stay empty.
    return { error: null, needsConfirm: Boolean(data.user && !data.session) };
  }, []);

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured) await supabase.auth.signOut();
  }, []);

  return {
    available: isSupabaseConfigured,
    loading,
    session,
    user: session?.user ?? null,
    email: session?.user?.email ?? null,
    // What to show the user: the username they typed, not the internal address.
    username: session?.user?.email?.replace(`@${INTERNAL_DOMAIN}`, '') ?? null,
    signIn,
    signUp,
    signOut,
  };
}
