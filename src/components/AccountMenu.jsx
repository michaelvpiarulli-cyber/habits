import { useEffect } from 'react';
import { useData } from '../context/DataProvider';
import { useLife } from '../context/LifeProvider';
import { GoogleConnect } from './GoogleConnect';
import { nowISO } from '../lib/mappers';
import { todayISO } from '../lib/dates';
import { isNativeApp, isStandaloneDisplay, needsIosInstallHint } from '../lib/install';

const THEMES = [
  ['light', 'Light'],
  ['dark', 'Dark'],
  ['system', 'System'],
];

/**
 * Settings — sync status, theme, install hints. No accounts or passwords;
 * every device shares one household database.
 */
export function AccountMenu({ theme, onClose }) {
  const {
    syncState,
    syncError,
    syncNow,
    syncAvailable,
    countdown,
    setCountdown,
    snapshot,
  } = useData();
  const life = useLife();

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const status = !syncAvailable
    ? 'On this device only'
    : {
        syncing: 'Syncing across your devices…',
        synced: 'Synced to every device',
        error: 'Sync failed. It will retry automatically.',
        idle: 'Connecting…',
      }[syncState] || 'Shared household sync';

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label="Settings">
      <button type="button" className="sheet__scrim" onClick={onClose} aria-label="Close" />

      <div className="sheet__panel">
        <header className="sheet__head">
          <h2 className="sheet__title">Settings</h2>
          <button type="button" className="sheet__close" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="sheet__body">
          <p className={`status status--${syncState}`}>{status}</p>

          {syncAvailable && (
            <div className="field">
              <p className="field__hint">
                One household database — habits, life pages, fridge, and the rest save to the
                cloud and show up on every device. No sign-in.
              </p>
              {syncError && <p className="note note--bad">{syncError}</p>}
              {life.syncError && life.syncError !== syncError && (
                <p className="note note--bad">{life.syncError}</p>
              )}
              <button
                type="button"
                className="btn"
                onClick={() => {
                  syncNow();
                  life.syncNow?.();
                }}
              >
                Sync now
              </button>
            </div>
          )}

          {!syncAvailable && (
            <p className="field__hint">
              Cloud sync is off in this build. Everything stays in this browser until Supabase is
              configured.
            </p>
          )}

          <fieldset className="field">
            <legend className="field__label">iPhone</legend>
            {isNativeApp() ? (
              <p className="field__hint">Installed as Tally on this iPhone.</p>
            ) : isStandaloneDisplay() ? (
              <p className="field__hint">Running from the Home Screen. That’s the app.</p>
            ) : needsIosInstallHint() ? (
              <ol className="install-steps">
                <li>Open this site in Safari — not Chrome or Instagram.</li>
                <li>Tap the Share button, then Add to Home Screen.</li>
                <li>Tap Add. Tally opens full-screen from its icon.</li>
              </ol>
            ) : (
              <p className="field__hint">
                On iPhone, open this site in Safari, tap Share, then Add to Home Screen. For a
                native install from Xcode, see the README.
              </p>
            )}
          </fieldset>

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
            <legend className="field__label">Google</legend>
            <GoogleConnect />
          </fieldset>

          <fieldset className="field">
            <legend className="field__label">Your data</legend>
            <button
              type="button"
              className="btn"
              onClick={() => {
                const payload = {
                  app: 'tally',
                  version: 2,
                  exportedAt: nowISO(),
                  ...snapshot(),
                  ...life.snapshot(),
                };
                const blob = new Blob([JSON.stringify(payload, null, 2)], {
                  type: 'application/json',
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `tally-${todayISO()}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Download a backup
            </button>
            <p className="field__hint">
              Habits, meals, tasks, calendar, books, jobs, and money as one JSON file.
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
