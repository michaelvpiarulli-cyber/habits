import { addDays, dow, WEEKDAY_LABELS } from './dates.js';

/**
 * The training week: two Push days, one Pull, one Legs, one run, one brisk walk.
 *
 * Fixed to weekdays rather than rotating, because a schedule you can recite —
 * Monday is push, Wednesday is legs, Saturday is the run — needs no lookup and
 * survives a missed day without drifting.
 *
 * Legs get their own day. Nothing lower-body appears on push or pull: squats,
 * lunges, hip thrusts and calf work all live on Wednesday, where they can be
 * the session rather than the thing tacked on after bench.
 *
 * ---------------------------------------------------------------------------
 * ATHLETE
 *
 * Male, 240 lb, home gym. Known working set: bench 135 × 8 × 4. Squat/leg
 * strength unknown — prescribed conservatively with that noted on the lifts.
 *
 * ---------------------------------------------------------------------------
 * EQUIPMENT — AND THE CEILING IT SETS
 *
 * A bar, a squat rack, a flat/incline bench, a lat pulldown, a seated row
 * machine, dumbbells of 5 / 10 / 15 lb ONLY, and TWO 45 lb plates. That last
 * one governs everything: 45 + 45 + 45 is 135 lb, and that is the most the
 * barbell can ever hold. Never prescribe a barbell load above 135.
 *
 * Bench at 135 for 8 is therefore already at the ceiling. There is no adding
 * five pounds. So barbell lifts progress the only ways left when load is fixed
 * — more reps, more sets, slower eccentrics — while the pulldown and row
 * machine carry their own stacks and are the only places real weight can still
 * be added.
 *
 * At 240 lb bodyweight, single-leg and bodyweight work is not filler. A
 * Bulgarian split squat is carrying most of 240 on one leg, which is heavier
 * than anything the bar can be loaded to. Bench dips are hard sets.
 *
 * ---------------------------------------------------------------------------
 * BACK
 *
 * Written around a bad back, so there are no loaded hinges: no deadlift, no
 * Romanian deadlift, no bent-over row. Glutes and hamstrings come from barbell
 * hip thrusts — shoulders on the bench, spine supported — and rowing is seated.
 *
 * This is general programming, not physio. A back that rules out deadlifting
 * warrants a professional opinion, and squats still load the spine even with
 * hinges gone.
 *
 * ---------------------------------------------------------------------------
 * THURSDAY — PUSH (second push; replaces a walk)
 *
 * No hybrid "upper" days. One of the two walks becomes a second Push so the
 * week has two Push days and one run. Monday hits the 135 bench ceiling;
 * Thursday is a lighter incline-focused Push so press volume stays on Push
 * days only. Friday stays Pull. Sunday keeps the remaining brisk walk.
 * ---------------------------------------------------------------------------
 */

/** Hard equipment ceilings — enforced by tests. */
export const BARBELL_MAX_LB = 135;
export const DUMBBELL_MAX_LB = 15;

/**
 * Movements that are loaded hinges or otherwise forbidden for this back.
 * Matched case-insensitively against movement names.
 */
export const FORBIDDEN_MOVE_PATTERNS = [
  /\bdeadlift\b/i,
  /\bromanian\b/i,
  /\brdl\b/i,
  /\bbent[- ]?over\s+row\b/i,
  /\bgood\s+morning\b/i,
  /\bkettlebell\s+swing\b/i,
];

/**
 * Lower-body work that must not appear on push or pull days.
 * Legs stay on Wednesday.
 */
export const LOWER_BODY_PATTERNS = [
  /\bsquat\b/i,
  /\blunge\b/i,
  /\bhip\s+thrust\b/i,
  /\bcalf\b/i,
  /\bleg\s+press\b/i,
  /\bleg\s+curl\b/i,
  /\bleg\s+extension\b/i,
  /\brdl\b/i,
  /\bdeadlift\b/i,
];

/**
 * Each lift carries:
 *   move      — name
 *   sets      — sets × reps (or duration for cardio)
 *   load      — display string for the prescribed load
 *   loadKind  — barbell | dumbbell | machine | bodyweight | cardio
 *   loadLb    — numeric lb (barbell = bar total; dumbbell = per hand;
 *               machine = stack setting; null for bodyweight/cardio)
 *   note      — one-line reasoning so a wrong number can be corrected
 */
export const SESSIONS = {
  push: {
    kind: 'lift',
    name: 'Push',
    focus: 'chest, shoulders, triceps',
    lifts: [
      {
        move: 'Bench press',
        sets: '4 × 8–10',
        load: '135 lb',
        loadKind: 'barbell',
        loadLb: 135,
        note: 'Your known working set, already at the 135 bar ceiling — progress via reps, then a 3-second eccentric once 10 is clean',
      },
      {
        move: 'Overhead press',
        sets: '4 × 8',
        load: '80 lb',
        loadKind: 'barbell',
        loadLb: 80,
        note: '~60% of bench 135 (standard OHP:bench ratio); out of the rack',
      },
      {
        move: 'Close-grip bench press',
        sets: '3 × 10',
        load: '95 lb',
        loadKind: 'barbell',
        loadLb: 95,
        note: '~70% of bench — hands shoulder-width so triceps take over',
      },
      {
        move: 'Bench dips',
        sets: '3 × 12–15',
        load: 'bodyweight',
        loadKind: 'bodyweight',
        loadLb: null,
        note: 'At 240 lb this is a hard set, not a finisher — no dip station, hands on the bench edge',
      },
    ],
  },
  pull: {
    kind: 'lift',
    name: 'Pull',
    focus: 'back, biceps, rear delts',
    lifts: [
      {
        move: 'Wide-grip lat pulldown',
        sets: '4 × 8',
        load: '145 lb',
        loadKind: 'machine',
        loadLb: 145,
        note: 'Own stack — past the bar ceiling on purpose; one of two places you can still add real weight',
      },
      {
        move: 'Seated row',
        sets: '4 × 10',
        load: '120 lb',
        loadKind: 'machine',
        loadLb: 120,
        note: 'Seated replaces any bent-over row; squeeze at the end, torso quiet for the back',
      },
      {
        move: 'Close-grip pulldown',
        sets: '3 × 12',
        load: '120 lb',
        loadKind: 'machine',
        loadLb: 120,
        note: 'Narrow grip shifts to lower lats and biceps; stack again, not the bar',
      },
      {
        move: 'Barbell curl',
        sets: '3 × 12',
        load: '55 lb',
        loadKind: 'barbell',
        loadLb: 55,
        note: '~40% of bench as a curl starting point — bar + 5 a side; 15 lb DB hammers if the bar is tied up',
      },
    ],
  },
  legs: {
    kind: 'lift',
    name: 'Legs',
    focus: 'quads, glutes, hamstrings, calves',
    lifts: [
      {
        move: 'Back squat',
        sets: '4 × 8',
        load: '95 lb',
        loadKind: 'barbell',
        loadLb: 95,
        note: 'Squat strength unknown — start conservative under the 135 ceiling; build toward 135 via reps before adding load',
      },
      {
        move: 'Barbell hip thrust',
        sets: '4 × 10',
        load: '135 lb',
        loadKind: 'barbell',
        loadLb: 135,
        note: 'Shoulders on the bench, spine supported — posterior chain without a loaded hinge; at the bar ceiling so progress via reps',
      },
      {
        move: 'Bulgarian split squat',
        sets: '3 × 8 each',
        load: '15 lb each',
        loadKind: 'dumbbell',
        loadLb: 15,
        note: 'Rear foot on the bench; at 240 most of the load is you — the 15s are almost incidental',
      },
      {
        move: 'Standing calf raise',
        sets: '3 × 15–20',
        load: 'bodyweight',
        loadKind: 'bodyweight',
        loadLb: null,
        note: 'Off a step or plate; pause at the top — no leg-press machine available',
      },
    ],
  },
  /**
   * Thursday: second Push (replaces a walk). Lighter / incline-focused so it
   * is not Monday’s 135 ceiling session again.
   */
  push2: {
    kind: 'lift',
    name: 'Push',
    focus: 'chest, shoulders, triceps',
    lifts: [
      {
        move: 'Incline bench press',
        sets: '4 × 10',
        load: '115 lb',
        loadKind: 'barbell',
        loadLb: 115,
        note: '~85% of flat bench — upper chest volume without repeating Monday’s 135 ceiling work',
      },
      {
        move: 'Overhead press',
        sets: '3 × 10',
        load: '75 lb',
        loadKind: 'barbell',
        loadLb: 75,
        note: 'Slightly under Monday’s OHP — more reps, leave a couple in the tank mid-week',
      },
      {
        move: 'Dumbbell floor fly',
        sets: '3 × 12–15',
        load: '15 lb each',
        loadKind: 'dumbbell',
        loadLb: 15,
        note: 'Heaviest DB you own; stretch is the point — no cable crossover in this gym',
      },
      {
        move: 'Overhead triceps extension',
        sets: '3 × 12–15',
        load: '15 lb',
        loadKind: 'dumbbell',
        loadLb: 15,
        note: 'Both hands on one 15 lb DB, seated — matches the DB ceiling',
      },
    ],
  },
  /**
   * Friday: second Pull. Different angles than Tuesday so it is not the same
   * session twice.
   */
  pull2: {
    kind: 'lift',
    name: 'Pull',
    focus: 'back, biceps, rear delts',
    lifts: [
      {
        move: 'Seated row',
        sets: '4 × 8',
        load: '130 lb',
        loadKind: 'machine',
        loadLb: 130,
        note: 'Heavier than Tuesday’s row — primary pull today; torso quiet, no hinge',
      },
      {
        move: 'Wide-grip lat pulldown',
        sets: '4 × 10',
        load: '130 lb',
        loadKind: 'machine',
        loadLb: 130,
        note: 'Slightly lighter than Tuesday’s heavy pulldown; more reps for lat width',
      },
      {
        move: 'Incline rear-delt raise',
        sets: '3 × 15–20',
        load: '10 lb each',
        loadKind: 'dumbbell',
        loadLb: 10,
        note: 'Chest on the incline bench — rear delts without loading the low back; high reps at a light DB',
      },
      {
        move: 'Dumbbell hammer curl',
        sets: '3 × 12',
        load: '15 lb each',
        loadKind: 'dumbbell',
        loadLb: 15,
        note: 'Heaviest DBs you own; neutral grip is easier on the elbows than bar curls',
      },
    ],
  },
  run: {
    kind: 'run',
    name: 'Easy run',
    focus: '30 min, conversational pace',
    lifts: [
      {
        move: 'Easy run',
        sets: '30 min',
        load: 'conversational',
        loadKind: 'cardio',
        loadLb: null,
        note: 'If you cannot speak a full sentence, slow down — at 240 the joints prefer easy over fast',
      },
    ],
  },
  walk: {
    kind: 'walk',
    name: 'Brisk walk',
    focus: '30–40 min',
    lifts: [
      {
        move: 'Brisk walk',
        sets: '30–40 min',
        load: 'brisk',
        loadKind: 'cardio',
        loadLb: null,
        note: 'Breathing harder, not puffing — recovery between lift days, not another hard session',
      },
    ],
  },
};

/** Monday-first, matching dow() in lib/dates. */
export const WEEK = [
  SESSIONS.push, // Mon — Push (heavy)
  SESSIONS.pull, // Tue — Pull
  SESSIONS.legs, // Wed — Legs
  SESSIONS.push2, // Thu — second Push (was a walk)
  SESSIONS.pull2, // Fri — second Pull
  SESSIONS.run, // Sat — Easy run (only run)
  SESSIONS.walk, // Sun — Brisk walk (only walk)
];

/** The weekdays the lifting sessions land on — 0=Mon. */
export const LIFT_DAYS = [0, 1, 2, 3, 4];

export function sessionFor(dayOfWeek) {
  return WEEK[dayOfWeek] || SESSIONS.walk;
}

/**
 * Sessions after `fromIso` through the end of that Mon–Sun week.
 * On Sunday (nothing left this week) returns the following Mon–Sun as
 * "Next week" so the look-ahead is never empty.
 *
 * Each entry: { day, weekday, session } — same session objects as WEEK.
 */
export function weekAhead(fromIso) {
  const todayDow = dow(fromIso);
  const daysLeft = 6 - todayDow;

  if (daysLeft <= 0) {
    return {
      label: 'Next week',
      days: Array.from({ length: 7 }, (_, i) => {
        const day = addDays(fromIso, i + 1);
        const d = dow(day);
        return { day, weekday: WEEKDAY_LABELS[d], session: sessionFor(d) };
      }),
    };
  }

  return {
    label: 'Coming up',
    days: Array.from({ length: daysLeft }, (_, i) => {
      const day = addDays(fromIso, i + 1);
      const d = dow(day);
      return { day, weekday: WEEKDAY_LABELS[d], session: sessionFor(d) };
    }),
  };
}

/** Disclaimer shown under the expanded session list. */
export const PROGRAM_DISCLAIMER =
  'General programming, not physio. A back that rules out deadlifts warrants a professional opinion.';

/** The count habit today’s session writes into (Lift / Workout). */
export function findLiftHabit(habits) {
  return (
    habits.find((habit) => habit.kind === 'count' && /\blift\b/i.test(habit.name)) ||
    habits.find((habit) => habit.kind === 'count' && /\bworkout\b/i.test(habit.name)) ||
    null
  );
}

/** Optional walk habit cardio sessions can nudge. */
export function findWalkHabit(habits) {
  return habits.find((habit) => habit.kind === 'count' && /\bwalk\b/i.test(habit.name)) || null;
}

/** How far through a session the logged amount has gotten. */
export function sessionProgress(session, amount) {
  const total = session.lifts.length;
  const done = Math.max(0, Math.min(total, Number(amount) || 0));
  return {
    done,
    total,
    complete: total > 0 && done >= total,
    fraction: total ? done / total : 0,
  };
}
