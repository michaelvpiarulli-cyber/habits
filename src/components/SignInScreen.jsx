import { useState } from 'react';
import { friendlyAuthError } from '../lib/authGate';

/**
 * Signed-out gate. Same dark shell as the rest of Tally: paper, wordmark, one
 * quiet card. Create account is for the first owner, before the lock SQL runs.
 */
export function SignInScreen({ onSignIn, onSignUp }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [creating, setCreating] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError('');
    try {
      const action = creating ? onSignUp : onSignIn;
      const { error: authError } = await action(email, password);
      if (authError) setError(friendlyAuthError(authError));
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
          autoComplete={creating ? 'new-password' : 'current-password'}
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
          {pending ? (creating ? 'Creating account…' : 'Signing in…') : creating ? 'Create account' : 'Sign in'}
        </button>
        <button
          type="button"
          className="text-btn sign-in__switch"
          onClick={() => {
            setCreating((value) => !value);
            setError('');
          }}
        >
          {creating ? 'Already have an account? Sign in' : 'First time? Create account'}
        </button>
        <p className="field__hint">
          {creating
            ? 'This creates your owner account. Habits already in the database stay there.'
            : 'One owner. Create the account here before you run the lock SQL.'}
        </p>
      </form>
    </main>
  );
}
