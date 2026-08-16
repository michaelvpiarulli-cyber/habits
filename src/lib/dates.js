/**
 * Everything here works in the user's LOCAL timezone and passes dates around as
 * 'YYYY-MM-DD' strings.
 *
 * A habit is done "on a day" as the person living that day understands it, so
 * UTC is the wrong frame — at 8pm in Los Angeles, `new Date().toISOString()`
 * already says tomorrow. Parsing happens at local noon so that adding days can
 * never land on a DST boundary and slip an hour backwards into the day before.
 */

/** 'YYYY-MM-DD' for a Date, read in local time. */
export function isoOf(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayISO() {
  return isoOf(new Date());
}

/** 'YYYY-MM-DD' → Date at local noon. */
export function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function addDays(iso, n) {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return isoOf(d);
}

/** Whole days from `a` to `b`, positive when b is later. */
export function daysBetween(a, b) {
  return Math.round((parseISO(b) - parseISO(a)) / 86400000);
}

/** Day of week, Monday-first: 0=Mon … 6=Sun. Weeks start Monday throughout. */
export function dow(iso) {
  return (parseISO(iso).getDay() + 6) % 7;
}

/** The Monday of the week containing `iso`. */
export function startOfWeek(iso) {
  return addDays(iso, -dow(iso));
}

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const WEEKDAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** '27 Jul' */
export function formatShort(iso) {
  const d = parseISO(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** 'Mon 27 Jul' */
export function formatLong(iso) {
  return `${WEEKDAY_LABELS[dow(iso)]} ${formatShort(iso)}`;
}

export function monthLabel(iso) {
  return MONTHS[parseISO(iso).getMonth()];
}

/** 'Today' / 'Yesterday' / 'in 3 days' / '5 days ago' — for goal due dates. */
export function relativeDay(iso, from = todayISO()) {
  const n = daysBetween(from, iso);
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n === -1) return 'yesterday';
  if (n > 0) return n < 30 ? `in ${n} days` : `in ${Math.round(n / 30)} mo`;
  const p = -n;
  return p < 30 ? `${p} days ago` : `${Math.round(p / 30)} mo ago`;
}

/** Ascending list of every day in [from, to]. */
export function rangeOfDays(from, to) {
  const out = [];
  for (let d = from; daysBetween(d, to) >= 0; d = addDays(d, 1)) out.push(d);
  return out;
}

export function startOfMonth(iso) {
  const d = parseISO(iso);
  return isoOf(new Date(d.getFullYear(), d.getMonth(), 1, 12, 0, 0, 0));
}

export function addMonths(iso, n) {
  const d = parseISO(iso);
  d.setMonth(d.getMonth() + n);
  return isoOf(d);
}

export function daysInMonth(iso) {
  const d = parseISO(startOfMonth(iso));
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

export function endOfMonth(iso) {
  const start = startOfMonth(iso);
  return addDays(start, daysInMonth(start) - 1);
}

/** 'Aug 2026' */
export function monthTitle(iso) {
  const d = parseISO(iso);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Cells for a Monday-first month grid. Leading/trailing slots are null so the
 * weekday columns stay lined up.
 */
export function monthCells(iso) {
  const start = startOfMonth(iso);
  const lead = dow(start);
  const count = daysInMonth(start);
  const cells = Array.from({ length: lead }, () => null);
  for (let i = 0; i < count; i++) cells.push(addDays(start, i));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** '09:00' → '9:00 am' */
export function formatClock(hhmm) {
  if (!hhmm) return '';
  const [h, m] = String(hhmm)
    .split(':')
    .map((part) => Number(part));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return '';
  const am = h < 12;
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${am ? 'am' : 'pm'}`;
}

/** Add minutes to an 'HH:MM' clock, wrapping within the day. */
export function addMinutes(hhmm, minutes) {
  const [h, m] = String(hhmm || '09:00')
    .split(':')
    .map((part) => Number(part));
  const total = Math.max(0, h * 60 + m + minutes) % (24 * 60);
  const hour = Math.floor(total / 60);
  const min = total % 60;
  return `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}
