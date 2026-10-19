/**
 * Michael's weekly training plan.
 *
 * Monday / Wednesday / Friday alternate Strength A and Strength B, counted from
 * the Monday of 2024-01-01 so the rotation is stable across devices. Tuesday,
 * Thursday, and Saturday are a morning walk. Sunday is rest.
 */

import { addDays, daysBetween, dow, startOfWeek } from './dates.js';

/** Monday that week 0 of the rotation starts on. */
export const PLAN_EPOCH = '2024-01-01';

export const STRENGTH_A = {
  id: 'strength-a',
  name: 'Strength A',
  kind: 'strength',
  exercises: [
    { name: 'Squat' },
    { name: 'Bench' },
    { name: 'Cable row' },
    { name: 'RDL' },
    { name: 'Plank' },
  ],
};

export const STRENGTH_B = {
  id: 'strength-b',
  name: 'Strength B',
  kind: 'strength',
  exercises: [
    { name: 'RDL' },
    { name: 'DB shoulder press' },
    { name: 'Lat pulldown' },
    { name: 'Split squat' },
    { name: 'Curls' },
    { name: 'Pushdowns' },
  ],
};

export const WALK = {
  id: 'walk',
  name: 'Walk',
  kind: 'walk',
  startTime: '07:00',
  endTime: '08:00',
  window: '7:00–8:00 AM',
  exercises: [{ name: 'Walk', detail: '7:00–8:00 AM' }],
};

export const REST = {
  id: 'rest',
  name: 'Rest',
  kind: 'rest',
  exercises: [],
};

function strengthSlot(dayOfWeek) {
  if (dayOfWeek === 0) return 0;
  if (dayOfWeek === 2) return 1;
  if (dayOfWeek === 4) return 2;
  return null;
}

/** The plan for one calendar day. */
export function workoutFor(iso) {
  const dayOfWeek = dow(iso);
  if (dayOfWeek === 6) return { ...REST, day: iso };
  if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) {
    return { ...WALK, day: iso };
  }
  const slot = strengthSlot(dayOfWeek);
  const weeks = Math.floor(daysBetween(PLAN_EPOCH, startOfWeek(iso)) / 7);
  const index = weeks * 3 + slot;
  const even = ((index % 2) + 2) % 2 === 0;
  const plan = even ? STRENGTH_A : STRENGTH_B;
  return { ...plan, day: iso, index };
}

export function todayWorkout(iso) {
  return workoutFor(iso);
}

/** The next training day after `iso` (rest days are skipped). */
export function nextWorkout(iso) {
  for (let step = 1; step <= 7; step += 1) {
    const day = addDays(iso, step);
    const plan = workoutFor(day);
    if (plan.kind !== 'rest') return plan;
  }
  return null;
}

export function workoutDoneOn(logs, iso) {
  return (logs || []).find((row) => !row.deleted && row.day === iso && row.done) || null;
}
