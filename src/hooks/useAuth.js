import {
  createContext,
  createElement,
  useContext,
  useMemo,
} from 'react';
import { isSupabaseConfigured } from '../lib/supabase';
import { HOUSEHOLD_EMAIL, HOUSEHOLD_LABEL, HOUSEHOLD_OWNER_ID } from '../lib/household';

/**
 * Personal project auth — no logins.
 *
 * When Supabase is configured every device presents the same household
 * identity so DataProvider / LifeProvider sync against one shared database.
 * Sign-in forms are gone; Settings still shows sync status.
 */

const HOUSEHOLD_USER = Object.freeze({
  id: HOUSEHOLD_OWNER_ID,
  email: HOUSEHOLD_EMAIL,
  app_metadata: { provider: 'household' },
  user_metadata: { username: HOUSEHOLD_LABEL },
});

const AuthContext = createContext(null);

/** Kept for older call sites / tests that mapped usernames → emails. */
export function toEmail(identifier) {
  const id = String(identifier || '').trim();
  if (!id) return HOUSEHOLD_EMAIL;
  return id.includes('@') ? id.toLowerCase() : `${id.toLowerCase()}@tally.app`;
}

export function AuthProvider({ children }) {
  const value = useMemo(
    () => ({
      available: isSupabaseConfigured,
      loading: false,
      session: isSupabaseConfigured
        ? { user: HOUSEHOLD_USER, access_token: 'household' }
        : null,
      user: isSupabaseConfigured ? HOUSEHOLD_USER : null,
      email: isSupabaseConfigured ? HOUSEHOLD_EMAIL : null,
      username: isSupabaseConfigured ? HOUSEHOLD_LABEL : null,
      // No-ops — accounts are not part of this personal build.
      signIn: async () => ({ error: null }),
      signUp: async () => ({ error: null }),
      signOut: async () => {},
    }),
    []
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
