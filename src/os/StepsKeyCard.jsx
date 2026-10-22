import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const INGEST_URL = 'https://habits-silk-six.vercel.app/api/ingest';
const SAMPLE_BODY = '{"kind":"steps","date":"YYYY-MM-DD","steps":8420}';

export function StepsKeyCard() {
  const [ready, setReady] = useState(null);
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancel = false;
    if (!supabase) {
      setReady(false);
      return undefined;
    }
    supabase.rpc('steps_key_ready').then(({ data, error: rpcError }) => {
      if (cancel) return;
      if (rpcError) {
        setError('Steps setup is not ready yet.');
        setReady(false);
        return;
      }
      setReady(Boolean(data));
    });
    return () => {
      cancel = true;
    };
  }, []);

  const reveal = async () => {
    if (!supabase || busy) return;
    setBusy(true);
    setError('');
    setCopied(false);
    const { data, error: rpcError } = await supabase.rpc('reveal_steps_key');
    setBusy(false);
    if (rpcError || !data) {
      setError('Could not create a steps key.');
      return;
    }
    setKey(String(data));
    setReady(true);
  };

  const copy = async () => {
    if (!key) return;
    try {
      await navigator.clipboard.writeText(key);
      setCopied(true);
    } catch {
      setError('Select the key and copy it.');
    }
  };

  return (
    <section className="steps-setup">
      <h2>Steps</h2>
      <p className="quiet">
        An iPhone Shortcut can send today&apos;s step count. At 10,000 or more, the 10,000 steps habit is checked for that day. You can still tap it yourself. A lower count never removes a check you made by hand.
      </p>

      {ready == null ? <p className="quiet">Checking the steps key.</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {key ? (
        <div className="field">
          <span>Steps key. Copy it into the shortcut. It stays hidden after you leave this page.</span>
          <input readOnly value={key} aria-label="Steps key" autoComplete="off" spellCheck="false" />
          <div className="btn-row">
            <button type="button" className="btn" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
          </div>
        </div>
      ) : (
        <div className="btn-row">
          <button type="button" className="btn" onClick={reveal} disabled={busy || ready == null}>
            {busy ? 'Working' : ready ? 'Replace steps key' : 'Show steps key'}
          </button>
        </div>
      )}
      {ready && !key ? (
        <p className="quiet">A steps key is already set. Replacing it stops the old shortcut until you paste the new key.</p>
      ) : null}

      <ol className="steps-howto">
        <li>Open Shortcuts and make a new shortcut named Send steps.</li>
        <li>Add Find Health Samples. Set Type to Steps, and set the start and end dates to today.</li>
        <li>Add Calculate Statistics and choose Sum. That number is today&apos;s steps.</li>
        <li>
          Add Get Contents of URL.
          <div>URL: <code>{INGEST_URL}</code></div>
          <div>Method: POST</div>
          <div>Header name: <code>x-tally-ingest-key</code></div>
          <div>Header value: the steps key from above.</div>
          <div>Request Body: JSON</div>
          <pre>{SAMPLE_BODY}</pre>
          <p>Put today&apos;s date in date, formatted yyyy-MM-dd. Put the step sum in steps.</p>
        </li>
        <li>Open Automation, choose Time of Day, set 9:00 PM, repeat Daily, and choose Run Immediately.</li>
        <li>Pick Send steps and turn off Ask Before Running. Allow Health the first time it runs.</li>
      </ol>
    </section>
  );
}
