import { useEffect, useState } from 'react';
import { useData } from '../context/DataProvider';

const THEMES = [
  ['light', 'Light'],
  ['dark', 'Dark'],
  ['system', 'System'],
];

/**
 * Account, sync state, and theme in one sheet.
 *
 * Signing in is optional by design — everything works on the device without an
 * account, and an account only adds the second device.
 */
export function AccountMenu({ auth, theme, onClose }) {
  const {
    syncState,
    syncError,
    syncNow,
    syncAvailable,
    countdown,
    setCountdown,
    exportAll,
  } = useData();
  const [mode, setMode] = useState('in'); // 'in' | 'up'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const result =
      mode === 'in' ? await auth.signIn(username, password) : await auth.signUp(username, password);
    setBusy(false);
    if (result.error) setMessage({ tone: 'bad', text: result.error });
    else if (result.needsConfirm)
      setMessage({
        tone: 'bad',
        text: 'This project still requires email confirmation, which a username account can’t receive. Turn off “Confirm email” in Supabase → Authentication → Providers → Email, then sign in.',
      });
    else onClose();
  };

  const status = !syncAvailable
    ? 'On this device only'
    : !auth.user
      ? 'Not signed in — this device only'
      : { syncing: 'Syncing…', synced: 'Synced', error: 'Sync failed. It will retry automatically.' }[
          syncState
        ] || 'Signed in';

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label="Account and settings">
      <button type="button" className="sheet__scrim" onClick={onClose} aria-label="Close" />

      <div className="sheet__panel">
        <header className="sheet__head">
          <h2 className="sheet__title">Account</h2>
          <button type="button" className="sheet__close" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="sheet__body">
          <p className={`status status--${syncState}`}>{status}</p>

          {!syncAvailable && (
            <p className="field__hint">
              Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to turn on
              accounts and sync. Until then everything is saved in this browser.
            </p>
          )}

          {syncAvailable && auth.user && (
            <div className="field">
              <p className="account__email">{auth.username}</p>
              {syncError && <p className="note note--bad">{syncError}</p>}
              <button type="button" className="btn" onClick={syncNow}>
                Sync now
              </button>
              <button type="button" className="btn" onClick={auth.signOut}>
                Sign out
              </button>
            </div>
          )}

          {syncAvailable && !auth.user && (
            <form className="field" onSubmit={submit}>
              <div className="segmented">
                <label className={`segmented__item ${mode === 'in' ? 'is-on' : ''}`}>
                  <input type="radio" checked={mode === 'in'} onChange={() => setMode('in')} />
                  Sign in
                </label>
                <label className={`segmented__item ${mode === 'up' ? 'is-on' : ''}`}>
                  <input type="radio" checked={mode === 'up'} onChange={() => setMode('up')} />
                  Create account
                </label>
              </div>

              <label className="field__label" htmlFor="account-username">
                Username
              </label>
              <input
                id="account-username"
                className="field__input"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                required
                minLength={2}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="michael"
              />

              <label className="field__label" htmlFor="account-password">
                Password
              </label>
              <input
                id="account-password"
                className="field__input"
                type="password"
                autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              {message && <p className={`note note--${message.tone}`}>{message.text}</p>}

              <button type="submit" className="btn btn--primary" disabled={busy}>
                {busy ? 'Working…' : mode === 'in' ? 'Sign in' : 'Create account'}
              </button>
              <p className="field__hint">
                No email, no confirmation. What’s already on this device merges into the account —
                nothing is replaced.
              </p>
            </form>
          )}

          <fieldset className="field">
            <legend className="field__label">Counting down to</legend>
            <div className="field--split">
              <label className="field__label" htmlFor="cd-label">
                Name
              </label>
              <input
                id="cd-label"
                className="field__input"
                value={countdown.label}
                onChange={(e) => setCountdown({ ...countdown, label: e.target.value })}
                placeholder="Baby due"
                maxLength={40}
              />
              <label className="field__label" htmlFor="cd-date">
                Date
              </label>
              <input
                id="cd-date"
                className="field__input"
                type="date"
                value={countdown.date}
                onChange={(e) => setCountdown({ ...countdown, date: e.target.value })}
              />
            </div>
            <label className="check">
              <input
                type="checkbox"
                checked={countdown.kind === 'pregnancy'}
                onChange={(e) =>
                  setCountdown({ ...countdown, kind: e.target.checked ? 'pregnancy' : 'date' })
                }
              />
              <span>It’s a due date — show pregnancy weeks</span>
            </label>
            <p className="field__hint">
              Shows on Today. Clear the date to hide it. Once the day passes it keeps counting up,
              so it turns into a day counter on its own.
            </p>
          </fieldset>

          <fieldset className="field">
            <legend className="field__label">Your data</legend>
            <button type="button" className="btn" onClick={exportAll}>
              Download a backup
            </button>
            <p className="field__hint">
              Every habit, log, goal, value, note, meal log, and review as one JSON file. Worth
              doing now and then regardless of sync — a file on your own disk is the copy nobody
              else can lose.
            </p>
          </fieldset>

          <fieldset className="field">
            <legend className="field__label">Theme</legend>
            <div className="segmented">
              {THEMES.map(([id, label]) => (
                <label key={id} className={`segmented__item ${theme.pref === id ? 'is-on' : ''}`}>
                  <input
                    type="radio"
                    name="theme"
                    checked={theme.pref === id}
                    onChange={() => theme.setPref(id)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </div>
    </div>
  );
}
