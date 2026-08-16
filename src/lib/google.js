/**
 * Google Calendar + Gmail from the browser.
 *
 * A public OAuth client id is enough for the GIS token flow — there is no
 * client secret in a SPA. Tokens live in sessionStorage and die with the tab.
 * Without VITE_GOOGLE_CLIENT_ID the rest of the dashboard still works; Google
 * is an optional overlay on local tasks and events.
 */

const TOKEN_KEY = 'tally-google-token';
const GIS_SRC = 'https://accounts.google.com/gsi/client';
const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
export const GOOGLE_SCOPES = `${CALENDAR_SCOPE} ${GMAIL_SCOPE}`;

/**
 * OAuth Web client id. Public by design (the browser has to send it). Google
 * still only accepts requests from the JavaScript origins listed on the client.
 * VITE_GOOGLE_CLIENT_ID overrides this when set.
 */
const TALLY_GOOGLE_CLIENT_ID =
  '510058798821-lqoil90ssdlbhrv6n68cbc22qg7mn4lq.apps.googleusercontent.com';

export function googleClientId() {
  const id = import.meta.env?.VITE_GOOGLE_CLIENT_ID;
  return typeof id === 'string' && id.trim() ? id.trim() : TALLY_GOOGLE_CLIENT_ID;
}

export function isGoogleConfigured() {
  return Boolean(googleClientId());
}

export function readStoredToken() {
  try {
    const raw = sessionStorage.getItem(TOKEN_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed?.access_token) return null;
    if (parsed.expires_at && parsed.expires_at < Date.now() + 15_000) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeStoredToken(token) {
  if (!token?.access_token) {
    sessionStorage.removeItem(TOKEN_KEY);
    return;
  }
  const expiresAt =
    token.expires_at || Date.now() + Math.max(30, Number(token.expires_in) || 3600) * 1000;
  sessionStorage.setItem(
    TOKEN_KEY,
    JSON.stringify({ access_token: token.access_token, expires_at: expiresAt })
  );
}

export function clearStoredToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

export function loadGis() {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.google?.accounts?.oauth2) return Promise.resolve(window.google);
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-tally-gis]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google));
      existing.addEventListener('error', () => reject(new Error('Google sign-in failed to load.')));
      return;
    }
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.dataset.tallyGis = 'true';
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error('Google sign-in failed to load.'));
    document.head.appendChild(script);
  });
}

export function clockFromDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const match = String(value).match(/T(\d{2}:\d{2})/);
    return match ? match[1] : '';
  }
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function dayFromGoogle(start) {
  if (!start) return '';
  if (start.date) return start.date;
  if (start.dateTime) return String(start.dateTime).slice(0, 10);
  return '';
}

export function normalizeGoogleEvent(event) {
  const start = event.start || {};
  const end = event.end || {};
  const allDay = Boolean(start.date);
  return {
    id: event.id,
    title: event.summary || '(No title)',
    day: dayFromGoogle(start),
    startTime: allDay ? '' : clockFromDateTime(start.dateTime),
    endTime: allDay ? '' : clockFromDateTime(end.dateTime),
    allDay,
    location: event.location || '',
    href: event.htmlLink || '',
  };
}

export function googleEventBody({ title, day, startTime, endTime, allDay, description, location }) {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const body = {
    summary: title,
    description: description || undefined,
    location: location || undefined,
  };
  if (allDay || !startTime) {
    body.start = { date: day };
    body.end = { date: day };
  } else {
    body.start = { dateTime: `${day}T${startTime}:00`, timeZone };
    body.end = { dateTime: `${day}T${endTime || startTime}:00`, timeZone };
  }
  return body;
}

export function decodeBase64Url(value) {
  if (!value) return '';
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  try {
    return decodeURIComponent(
      atob(padded)
        .split('')
        .map((ch) => `%${ch.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join('')
    );
  } catch {
    try {
      return atob(padded);
    } catch {
      return '';
    }
  }
}

export function headerOf(payload, name) {
  const headers = payload?.payload?.headers || payload?.headers || [];
  const found = headers.find((h) => h.name?.toLowerCase() === name.toLowerCase());
  return found?.value || '';
}

export function normalizeGmailMessage(message) {
  const payload = message.payload || message;
  return {
    id: message.id,
    threadId: message.threadId,
    snippet: message.snippet || '',
    from: headerOf(message, 'From'),
    subject: headerOf(message, 'Subject') || '(No subject)',
    date: headerOf(message, 'Date'),
    href: `https://mail.google.com/mail/u/0/#inbox/${message.id}`,
    unread: (message.labelIds || []).includes('UNREAD'),
    body: decodeBase64Url(payload?.body?.data || ''),
  };
}

async function googleFetch(path, token, options = {}) {
  const url = path.startsWith('http') ? path : `https://www.googleapis.com${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data.error?.message || `Google request failed (${response.status})`);
    err.status = response.status;
    throw err;
  }
  return data;
}

export async function listGoogleEvents(token, timeMin, timeMax) {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '100',
  });
  const data = await googleFetch(`/calendar/v3/calendars/primary/events?${params}`, token);
  return (data.items || []).map(normalizeGoogleEvent).filter((event) => event.day);
}

export async function createGoogleEvent(token, fields) {
  const data = await googleFetch('/calendar/v3/calendars/primary/events', token, {
    method: 'POST',
    body: JSON.stringify(googleEventBody(fields)),
  });
  return normalizeGoogleEvent(data);
}

export async function deleteGoogleEvent(token, eventId) {
  await googleFetch(`/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`, token, {
    method: 'DELETE',
  });
}

export async function listGmailInbox(token, maxResults = 20) {
  const params = new URLSearchParams({
    maxResults: String(maxResults),
    labelIds: 'INBOX',
  });
  const list = await googleFetch(`/gmail/v1/users/me/messages?${params}`, token);
  const ids = (list.messages || []).map((m) => m.id);
  const messages = await Promise.all(
    ids.map((id) =>
      googleFetch(
        `/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
        token
      )
    )
  );
  return messages.filter(Boolean).map(normalizeGmailMessage);
}
