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
  if (/already registered|already been registered|user already exists/i.test(message)) {
    return 'That email already has an account. Sign in instead.';
  }
  if (/signups not allowed|sign-ups are closed|signup disabled/i.test(message)) {
    return 'Sign-ups are closed. Add the email in Supabase, then create the account.';
  }
  if (/password/i.test(message) && /at least|weak|short|6/i.test(message)) {
    return 'Use a password of at least 6 characters.';
  }
  return message;
}

/**
 * signUp returns a session when the project auto-confirms email. An empty
 * identities list is Supabase's "this email already exists" response.
 */
export function interpretSignUp(result) {
  if (result?.error) return { error: { message: friendlyAuthError(result.error) } };
  const identities = result?.data?.user?.identities;
  if (result?.data?.user && Array.isArray(identities) && identities.length === 0) {
    return { error: { message: 'That email already has an account. Sign in instead.' } };
  }
  if (!result?.data?.session) {
    return {
      error: { message: 'Account created. Confirm the email in your inbox, then sign in.' },
    };
  }
  return { error: null };
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
