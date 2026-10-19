/**
 * Robert Murray M'Cheyne's calendar (1842), public domain.
 * Four passages a day: family Old and New, private Old and New.
 * 365 readings. In a leap year 29 Feb is a catch-up day with no new passages.
 */

import plan from '../data/mcheyne.json' with { type: 'json' };
import { addDays, daysBetween } from './dates.js';

export const PLAN_NAME = "M'Cheyne";
export const PLAN_LENGTH = 365;

export function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** 0–364, or null on 29 Feb. */
export function planIndexForDate(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return null;
  const year = Number(iso.slice(0, 4));
  let index = daysBetween(`${year}-01-01`, iso);
  if (isLeapYear(year) && iso > `${year}-02-28`) {
    if (iso === `${year}-02-29`) return null;
    index -= 1;
  }
  if (index < 0 || index > 364) return null;
  return index;
}

export function readingsForIndex(index) {
  const day = plan[index];
  if (!day) return [];
  return [
    { slot: 0, track: 'Family', ref: day.family[0] },
    { slot: 1, track: 'Family', ref: day.family[1] },
    { slot: 2, track: 'Private', ref: day.secret[0] },
    { slot: 3, track: 'Private', ref: day.secret[1] },
  ];
}

export function readingsForDate(iso) {
  const index = planIndexForDate(iso);
  if (index == null) return { index: null, readings: [], catchUpDay: true };
  return { index, readings: readingsForIndex(index), catchUpDay: false };
}

export function checkKey(year, index) {
  return `${year}:${index}`;
}

export function slotsFor(checks, year, index) {
  const row = checks?.[checkKey(year, index)];
  return new Set(row?.slots || []);
}

export function isDayComplete(checks, year, index) {
  const slots = slotsFor(checks, year, index);
  return [0, 1, 2, 3].every((slot) => slots.has(slot));
}

export function toggleSlot(checks, year, index, slot, updatedAt) {
  const key = checkKey(year, index);
  const slots = slotsFor(checks, year, index);
  if (slots.has(slot)) slots.delete(slot);
  else slots.add(slot);
  return {
    ...(checks || {}),
    [key]: { slots: [...slots].sort((a, b) => a - b), updatedAt },
  };
}

export function withDayComplete(checks, year, index, updatedAt) {
  return {
    ...(checks || {}),
    [checkKey(year, index)]: { slots: [0, 1, 2, 3], updatedAt },
  };
}

/** Plan days from 1 Jan through yesterday that are not fully checked. */
export function missedDays(checks, today) {
  const year = Number(today.slice(0, 4));
  const missed = [];
  for (let iso = `${year}-01-01`; iso < today; iso = addDays(iso, 1)) {
    const index = planIndexForDate(iso);
    if (index == null) continue;
    if (!isDayComplete(checks, year, index)) missed.push({ iso, index, year });
  }
  return missed;
}

export function yearProgress(checks, today) {
  const year = Number(today.slice(0, 4));
  let elapsed = 0;
  let done = 0;
  for (let iso = `${year}-01-01`; iso <= today; iso = addDays(iso, 1)) {
    const index = planIndexForDate(iso);
    if (index == null) continue;
    elapsed += 1;
    if (isDayComplete(checks, year, index)) done += 1;
  }
  let yearDone = 0;
  for (let index = 0; index < PLAN_LENGTH; index += 1) {
    if (isDayComplete(checks, year, index)) yearDone += 1;
  }
  return { elapsed, done, yearDone, total: PLAN_LENGTH, behind: Math.max(0, elapsed - done) };
}
