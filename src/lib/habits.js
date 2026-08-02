import { WEEKDAY_LABELS } from './dates.js';

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
    target: 4,
    unit: 'moves',
    // Matches lift days in lib/workouts.js: Mon, Tue, Thu, Fri, Sun.
    cadence: 'weekdays',
    weekdays: [0, 1, 3, 4, 6],
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

const STARTER_ALIASES = new Map([
  ['whole foods', STARTER_HABITS[0].id],
  ['walk after meals', STARTER_HABITS[1].id],
  ['lift', STARTER_HABITS[2].id],
  ['workout', STARTER_HABITS[2].id],
  ['sleep', STARTER_HABITS[3].id],
  ['protein', STARTER_HABITS[4].id],
  ['weigh in', STARTER_HABITS[5].id],
]);

export const LIFT_STARTER_ID = STARTER_HABITS[2].id;

/**
 * Soft-upgrade the old Lift seed (daily · 2 lifts) to the program lift days.
 * Skips habits that have already been customized away from that shape.
 */
export function migrateLiftHabitToProgram(habits, migratedAt = new Date().toISOString()) {
  const programDays = [0, 1, 3, 4, 6];
  const changedIds = new Set();
  const next = habits.map((habit) => {
    if (habit.deleted || (habit.kind || 'check') !== 'count') return habit;
    const familyId =
      habit.id === LIFT_STARTER_ID
        ? LIFT_STARTER_ID
        : STARTER_ALIASES.get(normalizeStarterName(habit.name));
    if (familyId !== LIFT_STARTER_ID) return habit;

    const days = habit.weekdays || [];
    const isOldDefault =
      ((habit.cadence || 'daily') === 'daily' &&
        Number(habit.target) === 2 &&
        (habit.unit || '') === 'lifts' &&
        days.length === 0) ||
      // Prior fitness migration used Mon–Fri before Legs moved to Sunday.
      (habit.cadence === 'weekdays' &&
        Number(habit.target) === 4 &&
        (habit.unit || '') === 'moves' &&
        JSON.stringify(days) === JSON.stringify([0, 1, 2, 3, 4]));
    if (!isOldDefault) return habit;

    changedIds.add(habit.id);
    return {
      ...habit,
      target: 4,
      unit: 'moves',
      cadence: 'weekdays',
      weekdays: programDays,
      updatedAt: migratedAt,
    };
  });
  return { habits: next, changedIds };
}

const normalizeStarterName = (name) =>
  String(name || '')
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('en-US')
    .replace(/\s+/g, ' ');

const starterDefaults = (starter, sortOrder) => ({
  emoji: '',
  cadence: 'daily',
  weekdays: [],
  perWeek: 3,
  kind: 'check',
  target: null,
  unit: '',
  floor: null,
  cue: '',
  afterId: null,
  archived: false,
  sortOrder,
  ...starter,
});

const starterFor = (habit) => {
  const starterId = STARTER_ALIASES.get(normalizeStarterName(habit.name));
  const starter = STARTER_HABITS.find((candidate) => candidate.id === starterId);
  if (!starter || (habit.kind || 'check') !== (starter.kind || 'check')) return null;
  return starter;
};

/**
 * A generated starter has a durable provenance marker: SEED_TIME plus the
 * untouched starter payload. User-created records never receive that timestamp,
 * and editing a starter bumps it, so cleanup can be conservative without
 * collapsing intentional custom duplicates.
 */
export function isPristineStarterHabit(habit, starter = starterFor(habit)) {
  if (!starter || habit.updatedAt !== SEED_TIME) return false;
  const expected = starterDefaults(starter, STARTER_HABITS.indexOf(starter));
  return (
    normalizeStarterName(habit.name) === normalizeStarterName(starter.name) &&
    habit.emoji === expected.emoji &&
    (habit.cadence || 'daily') === expected.cadence &&
    JSON.stringify(habit.weekdays || []) === JSON.stringify(expected.weekdays) &&
    (habit.perWeek ?? 3) === expected.perWeek &&
    (habit.kind || 'check') === expected.kind &&
    (habit.target ?? null) === (expected.target ?? null) &&
    (habit.unit || '') === expected.unit &&
    (habit.floor ?? null) === expected.floor &&
    (habit.cue || '') === expected.cue &&
    (habit.afterId || null) === expected.afterId &&
    !!habit.archived === expected.archived &&
    (habit.sortOrder ?? 0) === expected.sortOrder
  );
}

const referenceCount = (habitId, logs, goals) =>
  logs.filter((log) => !log.deleted && log.habitId === habitId).length +
  goals.filter((goal) => !goal.deleted && goal.habitId === habitId).length;

const rankCanonical = (a, b, logs = [], goals = []) =>
  Number(isPristineStarterHabit(a)) - Number(isPristineStarterHabit(b)) ||
  referenceCount(b.id, logs, goals) - referenceCount(a.id, logs, goals) ||
  String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')) ||
  a.id.localeCompare(b.id);

/**
 * Reuse an established starter-family row during account migration. Matching
 * deliberately ignores editable presentation/target fields so renamed aliases
 * such as Workout/Lift and emoji changes do not create another seed copy.
 */
export function findStarterHabitCounterpart(seed, habits) {
  const starter = isPristineStarterHabit(seed) ? starterFor(seed) : null;
  if (!starter) return null;
  return (
    habits
      .filter(
        (habit) =>
          !habit.deleted &&
          habit.id !== seed.id &&
          starterFor(habit)?.id === starter.id
      )
      .sort((a, b) => rankCanonical(a, b))[0] || null
  );
}

const mergeNotes = (left, right) =>
  [...new Set([left, right].map((note) => (note || '').trim()).filter(Boolean))].join('\n');

/**
 * Remove only accidental starter seeds, preserve custom duplicates, and move
 * history to the surviving row. Every changed record is returned as a normal
 * LWW edit so the caller can upsert tombstones/foreign-key changes to Supabase.
 */
export function cleanupStarterHabitDuplicates(
  habits,
  logs,
  goals,
  cleanedAt = new Date().toISOString()
) {
  const canonicalByRemovedId = new Map();

  for (const starter of STARTER_HABITS) {
    const family = habits.filter(
      (habit) => !habit.deleted && starterFor(habit)?.id === starter.id
    );
    const pristine = family.filter((habit) => isPristineStarterHabit(habit, starter));
    if (pristine.length === 0) continue;

    const established = family.filter((habit) => !isPristineStarterHabit(habit, starter));
    if (established.length > 0) {
      const canonical = established.sort((a, b) => rankCanonical(a, b, logs, goals))[0];
      pristine.forEach((habit) => canonicalByRemovedId.set(habit.id, canonical.id));
    } else if (pristine.length > 1) {
      const [canonical, ...duplicates] = pristine.sort((a, b) =>
        rankCanonical(a, b, logs, goals)
      );
      duplicates.forEach((habit) => canonicalByRemovedId.set(habit.id, canonical.id));
    }
  }

  if (canonicalByRemovedId.size === 0) {
    return {
      habits,
      logs,
      goals,
      changed: { habits: new Set(), logs: new Set(), goals: new Set() },
    };
  }

  const changed = { habits: new Set(), logs: new Set(), goals: new Set() };
  const nextHabits = habits.map((habit) => {
    const canonicalId = canonicalByRemovedId.get(habit.id);
    if (canonicalId) {
      changed.habits.add(habit.id);
      return { ...habit, deleted: true, updatedAt: cleanedAt };
    }
    const nextAfterId = canonicalByRemovedId.get(habit.afterId);
    if (nextAfterId) {
      changed.habits.add(habit.id);
      return { ...habit, afterId: nextAfterId, updatedAt: cleanedAt };
    }
    return habit;
  });

  const nextLogs = logs.map((log) => ({ ...log }));
  const logByHabitDay = new Map(
    nextLogs.map((log) => [`${log.habitId}:${log.day}`, log])
  );

  for (const log of nextLogs) {
    const canonicalId = canonicalByRemovedId.get(log.habitId);
    if (!canonicalId || log.deleted) continue;
    const canonicalKey = `${canonicalId}:${log.day}`;
    const existing = logByHabitDay.get(canonicalKey);

    if (!existing) {
      logByHabitDay.delete(`${log.habitId}:${log.day}`);
      log.habitId = canonicalId;
      log.updatedAt = cleanedAt;
      logByHabitDay.set(canonicalKey, log);
      changed.logs.add(log.id);
      continue;
    }

    const amounts = [existing.amount, log.amount].filter(
      (amount) => amount !== null && amount !== undefined
    );
    existing.amount = amounts.length ? Math.max(...amounts.map(Number)) : null;
    existing.note = mergeNotes(existing.note, log.note);
    existing.deleted = false;
    existing.updatedAt = cleanedAt;
    log.deleted = true;
    log.updatedAt = cleanedAt;
    changed.logs.add(existing.id);
    changed.logs.add(log.id);
  }

  const nextGoals = goals.map((goal) => {
    const canonicalId = canonicalByRemovedId.get(goal.habitId);
    if (!canonicalId) return goal;
    changed.goals.add(goal.id);
    return { ...goal, habitId: canonicalId, updatedAt: cleanedAt };
  });

  return { habits: nextHabits, logs: nextLogs, goals: nextGoals, changed };
}
