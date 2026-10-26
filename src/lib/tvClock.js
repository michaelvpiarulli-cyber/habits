/** Los Angeles clock for the TV dashboard. The Visio should not follow UTC. */

export const TV_ZONE = 'America/Los_Angeles';
export const TV_REFRESH_MS = 45000;

export function isTvPath(pathname) {
  const path = String(pathname || '').replace(/\/+$/, '') || '/';
  return path === '/tv';
}

export function laParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: TV_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const bag = {};
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== 'literal') bag[part.type] = part.value;
  }
  let hour = Number(bag.hour);
  if (!Number.isFinite(hour) || hour === 24) hour = 0;
  const minute = String(bag.minute || '00').padStart(2, '0');
  let clockHour = hour % 12;
  if (clockHour === 0) clockHour = 12;
  return {
    iso: `${bag.year}-${bag.month}-${bag.day}`,
    hour,
    minute,
    clock: `${clockHour}:${minute} ${hour < 12 ? 'AM' : 'PM'}`,
  };
}

export function greetingForHour(hour) {
  if (hour < 12) return 'Good morning.';
  if (hour < 17) return 'Good afternoon.';
  return 'Good evening.';
}
