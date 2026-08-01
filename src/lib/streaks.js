import { addDays, dow, isoOf, startOfWeek, todayISO, daysBetween } from './dates';

/**
 * Streak and completion maths for the three cadences.
 *
 * The rule that shapes all of it: a day you were never expected to act on is
 * not a day you failed. Rest days are skipped over rather than counted as
 * misses, so a Mon/Wed/Fri habit keeps its streak across the weekend.
 *
 * The second rule: today is never held against you. Nothing is a miss until the
 * day is over, so an untouched morning shows yesterday's streak intact instead
 * of resetting the count to zero before you have had a chance to act.
 */

// Far enough back to cover any real history, near enough to bound every loop.
const MAX_LOOKBACK_DAYS = 3660;

/**
 * Missed yesterday, but not the day before — the moment "never miss twice"
 * exists for. One miss is an accident; the rule is about the second one, so
 * this only fires on the single day where the warning still means something.
 */
export function atRiskToday(habit, keptSet, today = todayISO()) {
  if (habit.cadence === 'per_week' || hasNoDueDays(habit)) return false;
  if (keptSet.has(today)) return false;

  // Walk back to the most recent day this habit was actually expected.
  let prev = addDays(today, -1);
  for (let i = 0; i < 14 && !isDue(habit, prev); i++) prev = addDays(prev, -1);
  if (!isDue(habit, prev) || keptSet.has(prev)) return false;

  // And the one before that — if both were missed the streak is long gone and
  // a warning is just nagging.
  let before = addDays(prev, -1);
  for (let i = 0; i < 14 && !isDue(habit, before); i++) before = addDays(before, -1);
  return isDue(habit, before) ? keptSet.has(before) : false;
}

/** Is `habit` expected on `iso`? per_week habits accept any day. */
export function isDue(habit, iso) {
  if (habit.cadence === 'weekdays') return (habit.weekdays || []).includes(dow(iso));
  return true;
}

/** A weekdays habit with nothing selected can never come due — bail on loops. */
function hasNoDueDays(habit) {
  return habit.cadence === 'weekdays' && (habit.weekdays || []).length === 0;
}

/** Completions in the week beginning `weekStart` (Monday). */
export function countInWeek(doneSet, weekStart) {
  let n = 0;
  for (let i = 0; i < 7; i++) if (doneSet.has(addDays(weekStart, i))) n++;
  return n;
}

/** How many more times a per_week habit needs doing this week. 0 when met. */
export function remainingThisWeek(habit, doneSet, today = todayISO()) {
  if (habit.cadence !== 'per_week') return 0;
  return Math.max(0, habit.perWeek - countInWeek(doneSet, startOfWeek(today)));
}

/**
 * Consecutive due days completed, counting back from today. per_week habits
 * streak in WEEKS instead — the unit the target is set in.
 */
export function currentStreak(habit, doneSet, today = todayISO()) {
  if (doneSet.size === 0 || hasNoDueDays(habit)) return 0;

  if (habit.cadence === 'per_week') {
    let week = startOfWeek(today);
    let streak = 0;
    // The current week only adds to the streak once it is actually met; an
    // unmet week still in progress is simply not counted yet.
    if (countInWeek(doneSet, week) >= habit.perWeek) streak++;
    week = addDays(week, -7);
    while (countInWeek(doneSet, week) >= habit.perWeek) {
      streak++;
      week = addDays(week, -7);
      if (streak > MAX_LOOKBACK_DAYS / 7) break;
    }
    return streak;
  }

  let cursor = today;
  // Today counts if done, but is skipped rather than failed if not.
  if (isDue(habit, cursor) && !doneSet.has(cursor)) cursor = addDays(cursor, -1);

  let streak = 0;
  for (let i = 0; i < MAX_LOOKBACK_DAYS; i++) {
    if (!isDue(habit, cursor)) {
      cursor = addDays(cursor, -1);
      continue;
    }
    if (!doneSet.has(cursor)) break;
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** The longest run ever recorded, for context next to the current one. */
export function bestStreak(habit, doneSet, today = todayISO()) {
  if (doneSet.size === 0 || hasNoDueDays(habit)) return 0;

  const first = [...doneSet].sort()[0];

  if (habit.cadence === 'per_week') {
    let best = 0;
    let run = 0;
    const thisWeek = startOfWeek(today);
    for (let w = startOfWeek(first); daysBetween(w, thisWeek) > 0; w = addDays(w, 7)) {
      if (countInWeek(doneSet, w) >= habit.perWeek) {
        run++;
        best = Math.max(best, run);
      } else run = 0;
    }
    // The in-progress week can extend the best run but never end one.
    if (countInWeek(doneSet, thisWeek) >= habit.perWeek) best = Math.max(best, run + 1);
    return best;
  }

  let best = 0;
  let run = 0;
  for (let d = first; daysBetween(d, today) >= 0; d = addDays(d, 1)) {
    if (!isDue(habit, d)) continue;
    if (doneSet.has(d)) {
      run++;
      best = Math.max(best, run);
    } else if (d !== today) {
      run = 0; // today is still open — it cannot break the run yet
    }
  }
  return best;
}

/**
 * Share of expected days actually completed over a window, as 0–1.
 * per_week habits are measured against their weekly target, pro-rated.
 */
export function completionRate(habit, doneSet, from, to) {
  if (habit.cadence === 'per_week') {
    let expected = 0;
    let done = 0;
    for (let w = startOfWeek(from); daysBetween(w, to) >= 0; w = addDays(w, 7)) {
      expected += habit.perWeek;
      done += Math.min(countInWeek(doneSet, w), habit.perWeek);
    }
    return expected ? done / expected : 0;
  }

  let expected = 0;
  let done = 0;
  for (let d = from; daysBetween(d, to) >= 0; d = addDays(d, 1)) {
    if (!isDue(habit, d)) continue;
    expected++;
    if (doneSet.has(d)) done++;
  }
  return expected ? done / expected : 0;
}

/**
 * A day is "perfect" when every habit that was live and due on it was done —
 * the condition the overprint mark is reserved for. Habits created after the
 * day in question are ignored, so adding a habit today cannot retroactively
 * spoil last week.
 */
export function isPerfectDay(habits, doneSetsById, iso) {
  const live = habits.filter(
    (h) => isoOf(new Date(h.createdAt)) <= iso && isDue(h, iso) && h.cadence !== 'per_week'
  );
  if (live.length === 0) return false;
  return live.every((h) => doneSetsById.get(h.id)?.has(iso));
}

/**
 * How many perfect days in a row ending on `iso` (inclusive).
 * Skips days with nothing due — those are not failures, just blank paper.
 */
export function perfectDayStreak(habits, doneSetsById, iso = todayISO()) {
  let streak = 0;
  let cursor = iso;
  for (let i = 0; i < MAX_LOOKBACK_DAYS; i++) {
    const live = habits.filter(
      (h) =>
        isoOf(new Date(h.createdAt)) <= cursor &&
        isDue(h, cursor) &&
        h.cadence !== 'per_week'
    );
    if (live.length === 0) {
      cursor = addDays(cursor, -1);
      continue;
    }
    if (!isPerfectDay(habits, doneSetsById, cursor)) break;
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
