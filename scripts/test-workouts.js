/**
 * Workout program constraints — run with `npm test`.
 *
 * Plain node:assert so we don't invent a heavy test stack for a data module.
 */
import assert from 'node:assert/strict';
import {
  BARBELL_MAX_LB,
  DUMBBELL_MAX_LB,
  FORBIDDEN_MOVE_PATTERNS,
  LOWER_BODY_PATTERNS,
  LIFT_DAYS,
  PROGRAM_DISCLAIMER,
  SESSIONS,
  WEEK,
  sessionFor,
} from '../src/lib/workouts.js';

let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`  FAIL  ${name}`);
    console.error(`        ${err.message}`);
  }
}

console.log('workouts');

test('weekday schedule: Mon push, Tue pull, Wed legs, Thu walk, Fri upper, Sat run, Sun walk', () => {
  assert.equal(WEEK.length, 7);
  assert.equal(WEEK[0], SESSIONS.push);
  assert.equal(WEEK[1], SESSIONS.pull);
  assert.equal(WEEK[2], SESSIONS.legs);
  assert.equal(WEEK[3], SESSIONS.walk);
  assert.equal(WEEK[4], SESSIONS.upper);
  assert.equal(WEEK[5], SESSIONS.run);
  assert.equal(WEEK[6], SESSIONS.walk);

  assert.equal(sessionFor(0).name, 'Push');
  assert.equal(sessionFor(1).name, 'Pull');
  assert.equal(sessionFor(2).name, 'Legs');
  assert.equal(sessionFor(3).kind, 'walk');
  assert.equal(sessionFor(4).name, 'Upper');
  assert.equal(sessionFor(5).kind, 'run');
  assert.equal(sessionFor(6).kind, 'walk');
});

test('lift days are Mon, Tue, Wed, Fri (0, 1, 2, 4)', () => {
  assert.deepEqual(LIFT_DAYS, [0, 1, 2, 4]);
  for (const d of LIFT_DAYS) {
    assert.equal(sessionFor(d).kind, 'lift');
  }
});

test('no squats, lunges, hip thrusts, or calf work on push or pull days', () => {
  for (const day of [SESSIONS.push, SESSIONS.pull]) {
    for (const lift of day.lifts) {
      for (const pat of LOWER_BODY_PATTERNS) {
        assert.equal(
          pat.test(lift.move),
          false,
          `"${lift.move}" on ${day.name} matches lower-body pattern ${pat}`
        );
      }
    }
  }
});

test('legs day is the only place for squat / lunge / hip thrust / calf work', () => {
  const lowerHits = [];
  for (const session of WEEK) {
    for (const lift of session.lifts) {
      if (LOWER_BODY_PATTERNS.some((p) => p.test(lift.move))) {
        lowerHits.push({ session: session.name, move: lift.move });
      }
    }
  }
  assert.ok(lowerHits.length > 0, 'expected some lower-body work in the week');
  for (const hit of lowerHits) {
    assert.equal(hit.session, 'Legs', `${hit.move} appeared on ${hit.session}, not Legs`);
  }
});

test('no forbidden hinge / back movements anywhere in the week', () => {
  for (const session of WEEK) {
    for (const lift of session.lifts) {
      for (const pat of FORBIDDEN_MOVE_PATTERNS) {
        assert.equal(
          pat.test(lift.move),
          false,
          `"${lift.move}" on ${session.name} matches forbidden pattern ${pat}`
        );
      }
    }
  }
});

test('no barbell load above 135 lb', () => {
  for (const session of WEEK) {
    for (const lift of session.lifts) {
      if (lift.loadKind !== 'barbell') continue;
      assert.ok(
        typeof lift.loadLb === 'number',
        `${lift.move}: barbell lifts need numeric loadLb`
      );
      assert.ok(
        lift.loadLb <= BARBELL_MAX_LB,
        `${lift.move}: barbell ${lift.loadLb} lb exceeds ${BARBELL_MAX_LB}`
      );
    }
  }
});

test('no dumbbell above 15 lb', () => {
  for (const session of WEEK) {
    for (const lift of session.lifts) {
      if (lift.loadKind !== 'dumbbell') continue;
      assert.ok(
        typeof lift.loadLb === 'number',
        `${lift.move}: dumbbell lifts need numeric loadLb`
      );
      assert.ok(
        lift.loadLb <= DUMBBELL_MAX_LB,
        `${lift.move}: dumbbell ${lift.loadLb} lb exceeds ${DUMBBELL_MAX_LB}`
      );
    }
  }
});

test('every movement has name, sets, load, and a one-line note', () => {
  for (const session of WEEK) {
    assert.ok(session.lifts.length > 0, `${session.name} has no movements`);
    for (const lift of session.lifts) {
      assert.ok(lift.move, 'missing move');
      assert.ok(lift.sets, `${lift.move}: missing sets`);
      assert.ok(lift.load, `${lift.move}: missing load`);
      assert.ok(lift.note && lift.note.length > 10, `${lift.move}: missing note`);
      assert.ok(
        ['barbell', 'dumbbell', 'machine', 'bodyweight', 'cardio'].includes(lift.loadKind),
        `${lift.move}: bad loadKind ${lift.loadKind}`
      );
    }
  }
});

test('hip thrusts use supported spine framing (not a hinge substitute dump)', () => {
  const thrust = SESSIONS.legs.lifts.find((l) => /hip\s+thrust/i.test(l.move));
  assert.ok(thrust, 'legs day must include a hip thrust');
  assert.match(thrust.note, /shoulder|bench|spine|support/i);
});

test('program disclaimer is present for the UI', () => {
  assert.match(PROGRAM_DISCLAIMER, /not physio/i);
  assert.match(PROGRAM_DISCLAIMER, /professional/i);
});

if (failed) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log('\nall tests passed');
