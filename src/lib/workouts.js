/**
 * The training week: push, pull, legs, a fourth lift, one run, two brisk walks.
 *
 * Fixed to weekdays rather than rotating, because a schedule you can recite —
 * Monday is push, Wednesday is legs, Saturday is the run — needs no lookup and
 * survives a missed day without drifting.
 *
 * Legs get their own day. Nothing lower-body appears on push or pull: squats,
 * lunges and hip thrusts all live on Wednesday, where they can be the session
 * rather than the thing tacked on after bench.
 *
 * ---------------------------------------------------------------------------
 * EQUIPMENT — AND THE CEILING IT SETS
 *
 * A bar, a squat rack, a bench, a lat pulldown, a row machine, dumbbells up to
 * 15 lb, and TWO 45 lb plates. That last one governs everything: 45 + 45 + 45
 * is 135 lb, and that is the most the barbell can ever hold.
 *
 * Bench at 135 for 8 is therefore already at the ceiling. There is no adding
 * five pounds. So barbell lifts progress the only ways left when load is fixed
 * — more reps, more sets, slower eccentrics — while the pulldown and row
 * machine carry their own stacks and are the only places real weight can still
 * be added.
 *
 * At 240 lb bodyweight, single-leg and bodyweight work is not filler. A
 * Bulgarian split squat is carrying most of 240 on one leg, which is heavier
 * than anything the bar can be loaded to.
 *
 * Two more 45s, or a set of 25s, is the single purchase that unlocks the most.
 *
 * BACK
 *
 * Written around a bad back, so there are no loaded hinges: no deadlift, no
 * Romanian deadlift, no bent-over row. Glutes and hamstrings come from hip
 * thrusts — spine supported on the bench — and rowing is seated.
 *
 * This is programming, not physio. A back that rules out deadlifting is worth
 * a professional look, and squats still load the spine even with hinges gone.
 * ---------------------------------------------------------------------------
 */

export const SESSIONS = {
  push: {
    kind: 'lift',
    name: 'Push',
    focus: 'Chest, shoulders, triceps',
    lifts: [
      { move: 'Bench press', sets: '4 × 10', load: '135 lb', hint: 'Your bar maxed out. No weight left to add, so add reps — once 12 is clean, switch to a 3-second lowering instead' },
      { move: 'Overhead press', sets: '4 × 8', load: '75 lb', hint: '15 a side, out of the rack' },
      { move: 'Close-grip bench press', sets: '3 × 10', load: '95 lb', hint: 'Hands shoulder-width. Triceps take over' },
      { move: 'Bench dips', sets: '3 × 15', load: 'bodyweight', hint: 'At 240 this is a real set, not a finisher' },
    ],
  },
  pull: {
    kind: 'lift',
    name: 'Pull',
    focus: 'Back, biceps, rear delts',
    lifts: [
      { move: 'Wide-grip lat pulldown', sets: '4 × 8', load: '145 lb', hint: 'Machine stack — one of only two places you can still add real weight' },
      { move: 'Seated row', sets: '4 × 10', load: '120 lb', hint: 'The other one. Squeeze at the back, no leaning' },
      { move: 'Close-grip pulldown', sets: '3 × 12', load: '120 lb', hint: 'Narrow grip shifts it to the lower lats and biceps' },
      { move: 'Barbell curl', sets: '3 × 12', load: '55 lb', hint: 'Bar plus 5 a side. Hammer curls with the 15s if the bar is tied up' },
    ],
  },
  legs: {
    kind: 'lift',
    name: 'Legs',
    focus: 'Quads, glutes, hamstrings, calves',
    lifts: [
      { move: 'Back squat', sets: '4 × 12', load: '135 lb', hint: 'The ceiling, so reps do the work. If your back objects, goblet squat with a plate held at the chest' },
      { move: 'Barbell hip thrust', sets: '4 × 12', load: '135 lb', hint: 'Shoulders on the bench. This is what replaces the deadlift — spine neutral and supported throughout' },
      { move: 'Bulgarian split squat', sets: '3 × 10 each', load: '15 lb each', hint: 'Rear foot on the bench. At 240 this is the hardest thing in the week — the dumbbells are almost incidental' },
      { move: 'Calf raise', sets: '3 × 20', load: 'bodyweight', hint: 'Off a step or a plate. Pause at the top' },
    ],
  },
  pushB: {
    kind: 'lift',
    name: 'Push II',
    focus: 'Lighter, higher reps',
    lifts: [
      { move: 'Incline bench press', sets: '4 × 10', load: '115 lb', hint: 'Bench on an incline in the rack. Upper chest, which flat pressing under-serves' },
      { move: 'Dumbbell floor fly', sets: '3 × 15', load: '15 lb each', hint: 'Your heaviest dumbbell. The stretch is the point, not the load' },
      { move: 'Lateral raise', sets: '3 × 20', load: '10 lb each', hint: 'High reps because the weight is light. Swinging means too heavy' },
      { move: 'Overhead triceps extension', sets: '3 × 15', load: '15 lb', hint: 'Both hands on one dumbbell, seated' },
    ],
  },
  run: {
    kind: 'run',
    name: 'Run',
    focus: 'One a week',
    lifts: [
      { move: 'Easy run', sets: '30 min', load: 'conversational', hint: 'If you cannot speak a full sentence, slow down. At 240 the joints prefer easy over fast' },
    ],
  },
  walk: {
    kind: 'walk',
    name: 'Brisk walk',
    focus: 'Easy day',
    lifts: [
      { move: 'Brisk walk', sets: '30–40 min', load: 'brisk', hint: 'Breathing harder, not puffing. Recovery, not training' },
    ],
  },
};

/** Monday-first, matching dow() in lib/dates. */
export const WEEK = [
  SESSIONS.push, // Mon
  SESSIONS.pull, // Tue
  SESSIONS.legs, // Wed
  SESSIONS.walk, // Thu
  SESSIONS.pushB, // Fri
  SESSIONS.run, // Sat
  SESSIONS.walk, // Sun
];

/** The weekdays the lifting sessions land on — 0=Mon. */
export const LIFT_DAYS = [0, 1, 2, 4];

export function sessionFor(dayOfWeek) {
  return WEEK[dayOfWeek] || SESSIONS.walk;
}
