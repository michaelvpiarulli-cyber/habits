import { useEffect, useState } from 'react';
import { useGoogle } from '../context/GoogleProvider';
import { GoogleConnect } from './GoogleConnect';

export function MailView() {
  const google = useGoogle();
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const listMail = google.listMail;
  const googleConnected = google.connected;

  useEffect(() => {
    if (!googleConnected) {
      setMessages([]);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    listMail()
      .then((rows) => {
        if (!cancelled) setMessages(rows);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Could not load mail.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [googleConnected, listMail]);

  return (
    <div className="view">
      <header className="view__head">
        <h1 className="view__title">Mail</h1>
      </header>

      <GoogleConnect />
      {error && <p className="note note--bad">{error}</p>}
      {google.connected && loading && <p className="status">Loading inbox…</p>}

      {google.connected && !loading && messages.length === 0 && !error && (
        <p className="quiet">Inbox is empty.</p>
      )}

      {messages.length > 0 && (
        <ul className="mail-list">
          {messages.map((message) => (
            <li key={message.id} className={`mail ${message.unread ? 'is-unread' : ''}`}>
              <a href={message.href} target="_blank" rel="noreferrer">
                <span className="mail__from">{message.from || 'Unknown'}</span>
                <span className="mail__subject">{message.subject}</span>
                <span className="mail__snippet">{message.snippet}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
