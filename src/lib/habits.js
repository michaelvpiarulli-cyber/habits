import { WEEKDAY_LABELS } from './dates';

/**
 * What "done" means, per habit kind.
 *
 * A check habit is done when there is a log. A count or amount habit is done
 * when the logged value reaches its target — so a partial day is recorded and
 * visible, but it does not quietly pass as a completion and prop up a streak
 * that was not earned.
 */

export const KINDS = [
  { id: 'check', label: 'Done or not', hint: 'One tap. Best for things you either did or you didn’t.' },
  { id: 'count', label: 'Count up to', hint: 'Tap once per rep — 3 walks, 2 lifts.' },
  { id: 'amount', label: 'Hit a number', hint: 'Enter what you hit against a target — 8 h, 185 g.' },
  {
    id: 'measure',
    label: 'Track a number',
    hint: 'Record a reading and watch the trend — weight, resting heart rate. Showing up is the win.',
  },
];

/** The value recorded on a day, 0 when nothing is logged. */
export function valueOf(habit, log) {
  if (!log || log.deleted) return 0;
  if (habit.kind === 'check') return 1;
  return Number(log.amount) || 0;
}

export function targetOf(habit) {
  return habit.kind === 'check' ? 1 : Number(habit.target) || 1;
}

/**
 * A measure habit is complete the moment there is a reading, whatever it says.
 * The act being tracked is stepping on the scale, and a target weight is a
 * direction to move in over months — grading each morning against it would
 * turn a neutral measurement into a daily pass/fail.
 */
export function isComplete(habit, log) {
  const value = valueOf(habit, log);
  if (habit.kind === 'measure') return value > 0;
  return value >= targetOf(habit);
}

/**
 * The floor: the smallest version that still counts as showing up.
 *
 * Two states rather than one, because "did I hit the target" and "did I show
 * up at all" are different questions and only the second one should govern a
 * streak. A night of 7.5 hours against a target of 8 is not a failure, and a
 * system that calls it one is a system you quit after a bad week.
 */
export function floorOf(habit) {
  return habit.floor ? Number(habit.floor) : null;
}

/** Did the day clear the floor — i.e. does the chain survive? */
export function isKept(habit, log) {
  if (isComplete(habit, log)) return true;
  const floor = floorOf(habit);
  if (!floor) return false;
  return valueOf(habit, log) >= floor;
}

/** Cleared the floor but not the target — shown as a lighter mark. */
export function isFloorOnly(habit, log) {
  return isKept(habit, log) && !isComplete(habit, log);
}

/** 0–1, for how densely the day's mark gets inked. */
export function fractionOf(habit, log) {
  if (habit.kind === 'measure') return valueOf(habit, log) > 0 ? 1 : 0;
  return Math.max(0, Math.min(1, valueOf(habit, log) / targetOf(habit)));
}

/** Measure habits plot a line; everything else fills toward a target. */
export function isTrend(habit) {
  return habit.kind === 'measure';
}

/** 'Every day' · 'Mon, Wed, Fri' · '4× a week' */
export function describeCadence(habit) {
  if (habit.cadence === 'per_week') return `${habit.perWeek}× a week`;
  if (habit.cadence === 'weekdays') {
    const days = (habit.weekdays || []).slice().sort((a, b) => a - b);
    if (days.length === 0) return 'No days set';
    if (days.length === 7) return 'Every day';
    return days.map((d) => WEEKDAY_LABELS[d]).join(', ');
  }
  return 'Every day';
}

/** '3 walks' · '185 g' · 'goal 175 lb' · null for a plain check. */
export function describeTarget(habit) {
  if (habit.kind === 'check') return null;
  if (habit.kind === 'measure') {
    if (!habit.target) return habit.unit ? `tracked in ${habit.unit}` : 'tracked over time';
    return `goal ${habit.target}${habit.unit ? ` ${habit.unit}` : ''}`;
  }
  const t = targetOf(habit);
  return habit.unit ? `${t} ${habit.unit}` : `${t}`;
}

/**
 * The set the app opens with on a fresh device, so the first screen is the
 * real routine rather than an empty state asking you to design one. Everything
 * here is editable and deletable like any other habit.
 *
 * The ids are FIXED rather than generated. Two devices that both seed before
 * ever syncing would otherwise create two of each habit; with a stable id the
 * merge collapses them into one. SEED_TIME does the matching job for edits —
 * dating the seed to the past means any later change, on any device, is newer
 * and wins, so a habit you have deleted cannot be resurrected by a fresh
 * install seeding itself.
 */
export const SEED_TIME = '2020-01-01T00:00:00.000Z';

export const STARTER_HABITS = [
  {
    id: '7a110000-0000-4000-8000-000000000001',
    name: 'Whole foods',
    emoji: '\u{1F966}',
    kind: 'check',
    cadence: 'daily',
  },
  {
    id: '7a110000-0000-4000-8000-000000000002',
    name: 'Walk after meals',
    emoji: '\u{1F6B6}',
    kind: 'count',
    target: 3,
    unit: 'walks',
    cadence: 'daily',
  },
  {
    id: '7a110000-0000-4000-8000-000000000003',
    name: 'Lift',
    emoji: '\u{1F3CB}',
    kind: 'count',
    target: 2,
    unit: 'lifts',
    cadence: 'daily',
  },
  {
    id: '7a110000-0000-4000-8000-000000000004',
    name: 'Sleep',
    emoji: '\u{1F634}',
    kind: 'amount',
    target: 8,
    unit: 'h',
    cadence: 'daily',
  },
  {
    id: '7a110000-0000-4000-8000-000000000005',
    name: 'Protein',
    emoji: '\u{1F969}',
    kind: 'amount',
    target: 185,
    unit: 'g',
    cadence: 'daily',
  },
  {
    id: '7a110000-0000-4000-8000-000000000006',
    name: 'Weigh in',
    emoji: '\u{2696}',
    kind: 'measure',
    unit: 'lb',
    cadence: 'daily',
  },
];
