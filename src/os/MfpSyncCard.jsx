import { useCallback, useEffect, useState } from 'react';
import { HOUSEHOLD_OWNER_ID } from '../lib/household';
import { MFP_SETUP_MESSAGE } from '../lib/mfpDiary';
import { supabase } from '../lib/supabase';

function formatSynced(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Los_Angeles',
  });
}

export function MfpSyncCard({ variant = 'settings' }) {
  const [username, setUsername] = useState('');
  const [savedName, setSavedName] = useState('');
  const [error, setError] = useState('');
  const [note, setNote] = useState(MFP_SETUP_MESSAGE);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data, error: readError } = await supabase
      .from('mfp_sync')
      .select('username, last_synced_at, last_error')
      .eq('user_id', HOUSEHOLD_OWNER_ID)
      .maybeSingle();
    if (readError) return;
    const name = data?.username || '';
    setUsername(name);
    setSavedName(name);
    if (!name) {
      setNote(MFP_SETUP_MESSAGE);
      setError('');
      return;
    }
    setNote(data?.last_synced_at ? `Last synced ${formatSynced(data.last_synced_at)}.` : 'Not synced yet.');
    setError(data?.last_error || '');
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sync = async (name) => {
    setBusy(true);
    try {
      const response = await fetch('/api/mfp-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: name }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) setError(body.error || 'Could not sync MyFitnessPal.');
      else if (body.status === 'setup') {
        setNote(MFP_SETUP_MESSAGE);
        setError('');
      } else if (!body.ok) setError(body.message || 'Could not sync MyFitnessPal.');
      else setError('');
      await load();
    } catch {
      setError('Could not sync MyFitnessPal.');
    } finally {
      setBusy(false);
    }
  };

  const save = async (event) => {
    event.preventDefault();
    if (!supabase) return;
    const next = username.trim();
    setBusy(true);
    const { error: writeError } = await supabase.from('mfp_sync').upsert({
      user_id: HOUSEHOLD_OWNER_ID,
      username: next,
      updated_at: new Date().toISOString(),
      ...(next === savedName ? {} : { backfill_done: false }),
    });
    setBusy(false);
    if (writeError) {
      setError('Could not save the username.');
      return;
    }
    setSavedName(next);
    if (!next) {
      setNote(MFP_SETUP_MESSAGE);
      setError('');
    }
  };

  if (variant === 'food') {
    return (
      <div style={{ marginTop: 12 }}>
        <p className={error ? 'error' : 'quiet'}>{error || note}</p>
        <div className="btn-row">
          <button type="button" className="btn secondary" onClick={() => sync(savedName)} disabled={busy}>
            {busy ? 'Syncing...' : 'Sync now'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <section className="card">
      <h2>MyFitnessPal</h2>
      <p className="quiet">
        {savedName
          ? 'Tally reads the public diary every 30 minutes. Today and yesterday stay up to date.'
          : MFP_SETUP_MESSAGE}
      </p>
      <form onSubmit={save}>
        <label className="field">
          <span>Username</span>
          <input
            aria-label="MyFitnessPal username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck="false"
          />
        </label>
        <div className="btn-row">
          <button className="btn" type="submit" disabled={busy}>Save</button>
          <button type="button" className="btn secondary" onClick={() => sync(username.trim())} disabled={busy}>
            {busy ? 'Syncing...' : 'Sync now'}
          </button>
        </div>
      </form>
      {savedName && note ? <p className="faint">{note}</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
