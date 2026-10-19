import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

/**
 * Supabase Auth session for the one owner of this database.
 *
 * No session and no Supabase config both mean "not signed in": the app stays
 * on localStorage. Sign-up is intentionally not offered — the account is
 * created in the Supabase dashboard and new sign-ups are rejected in SQL.
 */

const AuthContext = createContext(null);

/** Kept for older call sites that mapped a username to an email address. */
export function toEmail(identifier) {
  const id = String(identifier || '').trim();
  if (!id) return '';
  return id.includes('@') ? id.toLowerCase() : `${id.toLowerCase()}@tally.app`;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return undefined;
    }

    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session ?? null);
      setLoading(false);
    }).catch(() => {
      if (!active) return;
      setSession(null);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email, password) => {
    if (!supabase) return { error: { message: 'Cloud sync is not configured.' } };
    const { error } = await supabase.auth.signInWithPassword({
      email: String(email || '').trim().toLowerCase(),
      password: password || '',
    });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  const user = session?.user ?? null;

  const value = useMemo(
    () => ({
      available: isSupabaseConfigured,
      loading,
      session,
      user,
      email: user?.email ?? null,
      username: user?.email ?? null,
      signIn,
      signUp: async () => ({
        error: { message: 'Sign-ups are closed. Create the account in the Supabase dashboard.' },
      }),
      signOut,
    }),
    [loading, session, user, signIn, signOut]
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
