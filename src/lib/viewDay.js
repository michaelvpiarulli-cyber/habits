import { todayISO } from './dates.js';
import { isIsoDay } from './isoDay.js';

/** A viewed day cannot be missing, invalid, or in the future. */
export function clampViewDay(value, today = todayISO()) {
  if (!isIsoDay(value) || value > today) return today;
  return value;
}

/** Read `?date=` from a search string. Today is the fallback. */
export function readViewDay(search = '', today = todayISO()) {
  const params = new URLSearchParams(String(search).replace(/^\?/, ''));
  return clampViewDay(params.get('date') || '', today);
}

/**
 * Search string for a viewed day. Today omits the param so the bare URL stays
 * the current day. Other params are left in place.
 */
export function searchForViewDay(search, day, today = todayISO()) {
  const params = new URLSearchParams(String(search || '').replace(/^\?/, ''));
  const clamped = clampViewDay(day, today);
  if (clamped === today) params.delete('date');
  else params.set('date', clamped);
  const text = params.toString();
  return text ? `?${text}` : '';
}
