import { useCallback, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Wraps Supabase email + password auth. Without configured keys it reports a
 * stable "signed out, unavailable" state so the app runs in local-only mode.
 */
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

  const signIn = useCallback(async (email, password) => {
    if (!isSupabaseConfigured) return { error: 'Sync is not set up yet.' };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message || null };
  }, []);

  const signUp = useCallback(async (email, password) => {
    if (!isSupabaseConfigured) return { error: 'Sync is not set up yet.' };
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      // Confirmation email (if enabled) sends the user back to this same site.
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) return { error: error.message };
    // With email confirmation enabled, signUp returns a user but no session.
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
    signIn,
    signUp,
    signOut,
  };
}
