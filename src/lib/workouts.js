/**
 * The training week: four lifts, one run, two brisk walks.
 *
 * Fixed to weekdays rather than rotating, because a schedule you can recite —
 * Monday is push, Tuesday is deadlifts, Saturday is the run — needs no lookup
 * and survives a missed day without drifting. Lifts sit on Mon/Tue and Thu/Fri
 * so each pattern gets about 48 hours before it comes round again, and the easy
 * days fall midweek and Sunday where they double as recovery.
 *
 * On a two-way push/pull split the legs have to live somewhere, so they are
 * folded in by pattern rather than given their own day: squats push, deadlifts
 * and hinges pull. That is what keeps this from being an arms-and-chest plan.
 *
 * ---------------------------------------------------------------------------
 * EQUIPMENT
 *
 * Written for a home gym: barbell and plates, squat rack, bench, lat pulldown,
 * row machine, dumbbells up to 25 lb, one 25 lb kettlebell.
 *
 * Nothing here needs a cable crossover, a dip station, or heavy dumbbells. The
 * light dumbbells are used where light is correct anyway — raises and rear
 * delts — and the barbell carries the load everywhere it matters.
 *
 * WHERE THE NUMBERS COME FROM
 *
 * Two known lifts anchor everything: bench 135 for 8, deadlift 225 for 8. Both
 * imply a one-rep max near 168 and 281, and the rest follow from the ratios
 * those two usually hold at this level.
 *
 * They are starting points, not prescriptions. The test is the last rep of the
 * last set: hard, and still clean. Miss that in either direction and the number
 * is wrong — change it.
 *
 * BACK
 *
 * Written around a bad back, so there are no loaded hinges: no deadlift, no
 * Romanian deadlift, no bent-over row. The glutes and hamstrings are trained
 * with hip thrusts instead — same muscles, spine supported on a bench — and the
 * rowing is done seated and chest-supported.
 *
 * This is programming, not physio. A back that rules out deadlifting is worth
 * a professional look, and squats still load the spine even with the hinges
 * gone.
 * ---------------------------------------------------------------------------
 */

export const SESSIONS = {
  push: {
    kind: 'lift',
    name: 'Push',
    focus: 'Chest, shoulders, triceps, quads',
    lifts: [
      { move: 'Bench press', sets: '4 × 8', load: '135 lb', hint: '45 a side. Your known lift — add 5 lb once all four sets go clean twice running' },
      { move: 'Back squat', sets: '4 × 8', load: '165 lb', hint: 'Deliberately light — if 8 moves easily, jump to 185. A bar on your back is still spinal load: if it complains, swap to a goblet squat with the kettlebell' },
      { move: 'Overhead press', sets: '3 × 8', load: '85 lb', hint: '20 a side, out of the rack. Presses run about 60% of bench' },
      { move: 'Bench dips', sets: '3 × 12', load: 'bodyweight', hint: 'Feet out on the floor, hands on the bench behind you' },
    ],
  },
  pull: {
    kind: 'lift',
    name: 'Pull',
    focus: 'Back, biceps, hamstrings',
    lifts: [
      { move: 'Barbell hip thrust', sets: '4 × 8', load: '185 lb', hint: 'Shoulders on the bench. Replaces the deadlift — same glutes and hamstrings, spine stays neutral and supported' },
      { move: 'Seated row', sets: '4 × 10', load: '120 lb', hint: 'Row machine, chest supported. Replaces the barbell row, which holds your back in a loaded hinge the whole set' },
      { move: 'Lat pulldown', sets: '3 × 10', load: '130 lb', hint: 'Roughly 70% of bodyweight for tens' },
      { move: 'Barbell curl', sets: '3 × 12', load: '55 lb', hint: 'Bar plus 5 a side. Back against the rack upright if it helps' },
    ],
  },
  pushB: {
    kind: 'lift',
    name: 'Push II',
    focus: 'Lighter, more reps',
    lifts: [
      { move: 'Close-grip bench press', sets: '4 × 8', load: '115 lb', hint: 'Hands shoulder-width. Triceps work, and the bar means you are not capped at 25 lb' },
      { move: 'Front squat', sets: '3 × 8', load: '135 lb', hint: 'About 80% of your back squat' },
      { move: 'Dumbbell floor fly', sets: '3 × 15', load: '25 lb each', hint: 'On the bench, slow and wide. Stretch matters more than load' },
      { move: 'Lateral raise', sets: '3 × 15', load: '15 lb each', hint: 'Light on purpose. Swinging means too heavy' },
    ],
  },
  pullB: {
    kind: 'lift',
    name: 'Pull II',
    focus: 'Back width, glutes, rear delts',
    lifts: [
      { move: 'Wide-grip lat pulldown', sets: '4 × 8', load: '145 lb', hint: 'Heavier than Tuesday, wider grip. Pull to the collarbone' },
      { move: 'Single-leg hip thrust', sets: '3 × 12 each', load: 'bodyweight', hint: 'Replaces the Romanian deadlift. One leg makes bodyweight plenty, and there is no bar over your spine' },
      { move: 'Seated row', sets: '3 × 12', load: '110 lb', hint: 'Squeeze at the back, no leaning' },
      { move: 'Hammer curl', sets: '3 × 12', load: '25 lb each', hint: 'Seated, so nothing is asked of the low back' },
    ],
  },
  run: {
    kind: 'run',
    name: 'Run',
    focus: 'One a week',
    lifts: [
      { move: 'Easy run', sets: '30 min', load: 'conversational', hint: 'If you cannot speak a full sentence, slow down' },
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
  SESSIONS.walk, // Wed
  SESSIONS.pushB, // Thu
  SESSIONS.pullB, // Fri
  SESSIONS.run, // Sat
  SESSIONS.walk, // Sun
];

/** The weekdays the lifting sessions land on — 0=Mon. */
export const LIFT_DAYS = [0, 1, 3, 4];

export function sessionFor(dayOfWeek) {
  return WEEK[dayOfWeek] || SESSIONS.walk;
}
