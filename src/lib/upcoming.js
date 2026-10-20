/** Calendar helpers for Today and Plan. */

import { agendaForDay } from './agenda.js';
import { addDays, formatClock } from './dates.js';

export function whenLabel(item) {
  if (!item || item.allDay || !item.startTime) return 'All day';
  const start = formatClock(item.startTime);
  const end = item.endTime ? formatClock(item.endTime) : '';
  return end ? `${start} to ${end}` : start;
}

export function clockMinutes(hhmm) {
  if (!hhmm) return null;
  const [h, m] = String(hhmm).split(':').map((part) => Number(part));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

/** Next timed item still ahead today, otherwise null. */
export function nextTimedItem(items, nowMinutes) {
  const upcoming = (items || [])
    .filter((item) => !item.allDay && clockMinutes(item.startTime) != null)
    .filter((item) => clockMinutes(item.startTime) >= nowMinutes)
    .sort((a, b) => clockMinutes(a.startTime) - clockMinutes(b.startTime));
  return upcoming[0] || null;
}

export function daysWithAgenda(localEvents, googleEvents, from, count = 14) {
  const days = [];
  for (let step = 0; step < count; step += 1) {
    const day = addDays(from, step);
    const items = agendaForDay(localEvents, googleEvents, day);
    if (items.length) days.push({ day, items });
  }
  return days;
}
