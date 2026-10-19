/**
 * Sign-in gate and Supabase auth client options.
 *
 * Email + password (not magic links): the Capacitor iOS shell is a WKWebView.
 * Magic links bounce through Safari and need a custom URL scheme or universal
 * links to get back into the app. A password session is created in-page and
 * kept in localStorage, which both the browser and the iOS wrapper already
 * persist.
 */

export function shouldShowSignIn({ available, loading, user }) {
  return Boolean(available && !loading && !user);
}

export function friendlyAuthError(error) {
  const message = error?.message || 'Could not sign in.';
  if (/invalid login credentials/i.test(message)) return 'Email or password is wrong.';
  if (/email not confirmed/i.test(message)) {
    return 'This user is not confirmed yet. In Supabase, open Authentication → Users and confirm the account, then try again.';
  }
  return message;
}

/**
 * @param {{ native?: boolean }} [options]
 * Capacitor's WKWebView can stall forever on navigator.locks, which
 * supabase-js uses to coordinate token refresh. Skip that lock only in the
 * native shell. Web keeps the default lock so two tabs don't refresh at once.
 * detectSessionInUrl stays off in the shell: password sign-in never lands
 * tokens in the URL, and a stray hash must not be parsed as a session.
 */
export function createAuthOptions({ native = false } = {}) {
  return {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: !native,
    ...(native
      ? {
          lock: async (_name, _acquireTimeout, fn) => fn(),
        }
      : {}),
  };
}
