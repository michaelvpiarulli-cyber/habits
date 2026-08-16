import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { addMinutes, endOfMonth, startOfMonth } from '../lib/dates';
import {
  clearStoredToken,
  createGoogleEvent,
  deleteGoogleEvent,
  googleClientId,
  isGoogleConfigured,
  listGmailInbox,
  listGoogleEvents,
  loadGis,
  GOOGLE_SCOPES,
  readStoredToken,
  writeStoredToken,
} from '../lib/google';

const GoogleContext = createContext(null);

export function GoogleProvider({ children }) {
  const [token, setToken] = useState(() =>
    typeof window === 'undefined' ? null : readStoredToken()
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const clientRef = useRef(null);
  const pending = useRef(null);

  useEffect(() => {
    if (!isGoogleConfigured()) return undefined;
    let cancelled = false;
    loadGis()
      .then((google) => {
        if (cancelled) return;
        clientRef.current = google.accounts.oauth2.initTokenClient({
          client_id: googleClientId(),
          scope: GOOGLE_SCOPES,
          callback: (response) => {
            if (response.error) {
              const message = response.error_description || response.error;
              setError(message);
              setToken(null);
              clearStoredToken();
              pending.current?.({ error: message });
              return;
            }
            const next = {
              access_token: response.access_token,
              expires_in: Number(response.expires_in) || 3600,
            };
            writeStoredToken(next);
            setToken(readStoredToken());
            setError('');
            pending.current?.({ error: null });
          },
        });
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Google sign-in failed to load.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const requestToken = useCallback((prompt) => {
    if (!isGoogleConfigured()) {
      return Promise.resolve({ error: 'Add VITE_GOOGLE_CLIENT_ID to connect Google.' });
    }
    if (!clientRef.current) {
      return Promise.resolve({ error: 'Google sign-in is still loading.' });
    }
    return new Promise((resolve) => {
      const finish = (result) => {
        if (pending.current !== finish) return;
        pending.current = null;
        window.clearTimeout(timer);
        setBusy(false);
        resolve(result);
      };
      const timer = window.setTimeout(
        () => finish({ error: 'Google sign-in was cancelled.' }),
        90_000
      );
      pending.current = finish;
      setBusy(true);
      try {
        clientRef.current.requestAccessToken({ prompt: prompt ?? 'consent' });
      } catch (err) {
        finish({ error: err.message || 'Could not open Google sign-in.' });
      }
    });
  }, []);

  const connect = useCallback(() => requestToken('consent'), [requestToken]);

  const disconnect = useCallback(() => {
    const access = token?.access_token;
    if (access && window.google?.accounts?.oauth2?.revoke) {
      window.google.accounts.oauth2.revoke(access, () => {});
    }
    clearStoredToken();
    setToken(null);
    setError('');
  }, [token]);

  const withToken = useCallback(
    async (fn) => {
      let current = readStoredToken() || token;
      if (!current?.access_token) {
        const result = await requestToken('');
        if (result.error) throw new Error(result.error);
        current = readStoredToken();
      }
      if (!current?.access_token) throw new Error('Connect Google first.');
      try {
        return await fn(current.access_token);
      } catch (err) {
        if (err.status === 401) {
          clearStoredToken();
          setToken(null);
          const result = await requestToken('consent');
          if (result.error) throw new Error(result.error);
          const retry = readStoredToken();
          if (!retry?.access_token) throw err;
          return fn(retry.access_token);
        }
        throw err;
      }
    },
    [token, requestToken]
  );

  const listEvents = useCallback(
    async (fromDay, toDay) => {
      const timeMin = `${fromDay}T00:00:00`;
      const timeMax = `${toDay}T23:59:59`;
      return withToken((access) => listGoogleEvents(access, timeMin, timeMax));
    },
    [withToken]
  );

  const monthEvents = useCallback(
    async (day) => listEvents(startOfMonth(day), endOfMonth(day)),
    [listEvents]
  );

  const addToCalendar = useCallback(
    async (fields) => {
      const allDay = fields.allDay || !fields.startTime;
      const payload = {
        title: fields.title,
        day: fields.day,
        startTime: fields.startTime || '',
        endTime: fields.endTime || (fields.startTime ? addMinutes(fields.startTime, 30) : ''),
        allDay,
        description: fields.description || fields.notes || '',
        location: fields.location || '',
      };
      const created = await withToken((access) => createGoogleEvent(access, payload));
      return created;
    },
    [withToken]
  );

  const removeFromCalendar = useCallback(
    async (eventId) => {
      if (!eventId) return;
      await withToken((access) => deleteGoogleEvent(access, eventId));
    },
    [withToken]
  );

  const listMail = useCallback(async () => withToken((access) => listGmailInbox(access)), [withToken]);

  const value = useMemo(
    () => ({
      configured: isGoogleConfigured(),
      connected: Boolean(token?.access_token),
      busy,
      error,
      connect,
      disconnect,
      listEvents,
      monthEvents,
      addToCalendar,
      removeFromCalendar,
      listMail,
    }),
    [
      token,
      busy,
      error,
      connect,
      disconnect,
      listEvents,
      monthEvents,
      addToCalendar,
      removeFromCalendar,
      listMail,
    ]
  );

  return <GoogleContext.Provider value={value}>{children}</GoogleContext.Provider>;
}

export function useGoogle() {
  const ctx = useContext(GoogleContext);
  if (!ctx) throw new Error('useGoogle must be used inside GoogleProvider');
  return ctx;
}
