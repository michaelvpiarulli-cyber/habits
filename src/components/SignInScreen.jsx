import { useState } from 'react';
import { friendlyAuthError } from '../lib/authGate';

/**
 * Signed-out gate. Same dark shell as the rest of Tally: paper, wordmark, one
 * quiet card. There is no sign-up — the account is created in Supabase.
 */
export function SignInScreen({ onSignIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError('');
    try {
      const { error: signInError } = await onSignIn(email, password);
      if (signInError) setError(friendlyAuthError(signInError));
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="sign-in">
      <form className="sign-in__card" onSubmit={submit}>
        <h1 className="wordmark sign-in__mark">
          Tally<span className="wordmark__dot" aria-hidden="true">.</span>
        </h1>
        <p className="sign-in__lede">
          Habits, weight, money, notes, and mail stay on this account.
        </p>

        <label className="field__label" htmlFor="sign-in-email">
          Email
        </label>
        <input
          id="sign-in-email"
          className="field__input"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck="false"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label className="field__label" htmlFor="sign-in-password">
          Password
        </label>
        <input
          id="sign-in-password"
          className="field__input"
          type="password"
          autoComplete="current-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && (
          <p className="note note--bad" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn--primary sign-in__submit" disabled={pending}>
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="field__hint">
          One owner. The account is created in the Supabase dashboard, not here.
        </p>
      </form>
    </main>
  );
}
