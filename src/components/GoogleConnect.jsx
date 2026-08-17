import { useGoogle } from '../context/GoogleProvider';

export function GoogleConnect({ compact = false }) {
  const google = useGoogle();

  if (!google.configured) return null;

  if (google.connected) {
    return (
      <p className={`google-bar ${compact ? 'is-compact' : ''}`}>
        <span className="status">Google on</span>
        <button type="button" className="text-btn" onClick={google.disconnect}>
          Disconnect
        </button>
      </p>
    );
  }

  return (
    <p className={`google-bar ${compact ? 'is-compact' : ''}`}>
      <button type="button" className="text-btn" onClick={google.connect} disabled={google.busy}>
        {google.busy ? 'Connecting…' : 'Connect Google'}
      </button>
      {google.error && <span className="note note--bad">{google.error}</span>}
    </p>
  );
}
