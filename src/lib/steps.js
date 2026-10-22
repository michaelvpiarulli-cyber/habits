/** The living "10,000 steps" habit. A tap still checks it. Ingest only adds a check. */
export const STEPS_HABIT_ID = '7a110000-0000-4000-8000-000000000011';
export const STEPS_GOAL = 10000;

export function isStepsHabit(habit) {
  if (!habit) return false;
  if (habit.id === STEPS_HABIT_ID) return true;
  return String(habit.name || '').trim().toLowerCase() === '10,000 steps';
}

export function formatStepCount(steps) {
  const n = Math.round(Number(steps) || 0);
  return n.toLocaleString('en-US');
}

export function stepsOnDay(rows, day) {
  const row = (rows || []).find((item) => item && item.day === day && !item.deleted);
  if (!row) return null;
  const steps = Number(row.steps);
  return Number.isFinite(steps) ? steps : null;
}
