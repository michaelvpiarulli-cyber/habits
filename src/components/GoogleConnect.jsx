import { useGoogle } from '../context/GoogleProvider';

export function GoogleConnect({ compact = false }) {
  const google = useGoogle();

  if (!google.configured) {
    return (
      <p className="field__hint">
        To connect Gmail and Google Calendar, add <code>VITE_GOOGLE_CLIENT_ID</code> from a Google
        Cloud OAuth client and restart the app.
      </p>
    );
  }

  if (google.connected) {
    return (
      <div className={`google-bar ${compact ? 'is-compact' : ''}`}>
        <p className="status status--synced">Google connected</p>
        <button type="button" className="chip" onClick={google.disconnect}>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className={`google-bar ${compact ? 'is-compact' : ''}`}>
      <button
        type="button"
        className="btn btn--primary"
        onClick={google.connect}
        disabled={google.busy}
      >
        {google.busy ? 'Connecting…' : 'Connect Google'}
      </button>
      {!compact && (
        <p className="field__hint">
          Read Gmail and add events to Google Calendar. Tally still keeps its own copy on this
          device.
        </p>
      )}
      {google.error && <p className="note note--bad">{google.error}</p>}
    </div>
  );
}
