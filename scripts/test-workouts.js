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
  parseSets,
  formatLoad,
  formatSets,
  prescribeNext,
  sessionFor,
  weekAhead,
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

test('weekday schedule: Mon push, Tue pull, Wed legs, Thu push, Fri pull, Sat run, Sun legs', () => {
  assert.equal(WEEK.length, 7);
  assert.equal(WEEK[0], SESSIONS.push);
  assert.equal(WEEK[1], SESSIONS.pull);
  assert.equal(WEEK[2], SESSIONS.legs);
  assert.equal(WEEK[3], SESSIONS.push2);
  assert.equal(WEEK[4], SESSIONS.pull2);
  assert.equal(WEEK[5], SESSIONS.run);
  assert.equal(WEEK[6], SESSIONS.legs);

  assert.equal(sessionFor(0).name, 'Push');
  assert.equal(sessionFor(1).name, 'Pull');
  assert.equal(sessionFor(2).name, 'Legs');
  assert.equal(sessionFor(3).name, 'Push');
  assert.equal(sessionFor(4).name, 'Pull');
  assert.equal(sessionFor(5).kind, 'run');
  assert.equal(sessionFor(6).name, 'Legs');

  const kinds = WEEK.map((s) => s.kind);
  assert.equal(kinds.filter((k) => k === 'run').length, 1);
  assert.equal(WEEK.filter((s) => s.name === 'Legs').length, 2);
  assert.equal(WEEK.filter((s) => s.name === 'Push').length, 2);
});

test('no hybrid upper day — lift days are only Push, Pull, or Legs', () => {
  for (const d of LIFT_DAYS) {
    const name = sessionFor(d).name;
    assert.ok(
      ['Push', 'Pull', 'Legs'].includes(name),
      `day ${d} is "${name}", expected Push/Pull/Legs`
    );
  }
  assert.equal(SESSIONS.upper, undefined);
});

test('lift days are every day except Saturday', () => {
  assert.deepEqual(LIFT_DAYS, [0, 1, 2, 3, 4, 6]);
  for (const d of LIFT_DAYS) {
    assert.equal(sessionFor(d).kind, 'lift');
  }
});

test('no squats, lunges, hip thrusts, or calf work on push or pull days', () => {
  for (const day of [SESSIONS.push, SESSIONS.push2, SESSIONS.pull, SESSIONS.pull2]) {
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

test('pull days have no chest / press / fly / dip work', () => {
  const chesty = /\b(bench|chest|fly|dip|press)\b/i;
  for (const day of [SESSIONS.pull, SESSIONS.pull2]) {
    for (const lift of day.lifts) {
      assert.equal(
        chesty.test(lift.move),
        false,
        `"${lift.move}" looks like push/chest work on ${day.name}`
      );
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

test('weekAhead lists remaining days of the week after today', () => {
  // A known Monday (2026-07-27) → Tue–Sun
  const ahead = weekAhead('2026-07-27');
  assert.equal(ahead.label, 'Coming up');
  assert.equal(ahead.days.length, 6);
  assert.deepEqual(
    ahead.days.map((d) => [d.weekday, d.session.name]),
    [
      ['Tue', 'Pull'],
      ['Wed', 'Legs'],
      ['Thu', 'Push'],
      ['Fri', 'Pull'],
      ['Sat', 'Easy run'],
      ['Sun', 'Legs'],
    ]
  );
  assert.equal(ahead.days[0].day, '2026-07-28');
});

test('weekAhead on Friday is Sat run then Sun legs', () => {
  const ahead = weekAhead('2026-07-31'); // Friday
  assert.equal(ahead.label, 'Coming up');
  assert.equal(ahead.days.length, 2);
  assert.equal(ahead.days[0].session.kind, 'run');
  assert.equal(ahead.days[1].session.name, 'Legs');
});

test('week has exactly one run and two legs days', () => {
  assert.equal(WEEK.filter((s) => s.kind === 'run').length, 1);
  assert.equal(WEEK.filter((s) => s.name === 'Legs').length, 2);
});

test('weekAhead on Sunday rolls to next Mon–Sun', () => {
  const ahead = weekAhead('2026-08-02'); // Sunday
  assert.equal(ahead.label, 'Next week');
  assert.equal(ahead.days.length, 7);
  assert.equal(ahead.days[0].day, '2026-08-03');
  assert.equal(ahead.days[0].session.name, 'Push');
  assert.equal(ahead.days[6].session.name, 'Legs');
});

test('parseSets reads set × rep ranges and each-side markers', () => {
  assert.deepEqual(parseSets('4 × 8–10'), {
    setCount: 4,
    repLow: 8,
    repHigh: 10,
    each: false,
  });
  assert.deepEqual(parseSets('3 × 8 each'), {
    setCount: 3,
    repLow: 8,
    repHigh: 8,
    each: true,
  });
  assert.equal(parseSets('30 min'), null);
});

test('formatLoad and formatSets match program display language', () => {
  assert.equal(formatLoad('barbell', 135), '135 lb');
  assert.equal(formatLoad('dumbbell', 15), '15 lb each');
  assert.equal(formatLoad('bodyweight', null), 'bodyweight');
  assert.equal(formatSets(4, 9), '4 × 9');
  assert.equal(formatSets(3, 10, { each: true }), '3 × 10 each');
});

test('prescribeNext returns the program baseline with no history', () => {
  const bench = SESSIONS.push.lifts[0];
  const next = prescribeNext(bench, null);
  assert.equal(next.source, 'program');
  assert.equal(next.loadLb, 135);
  assert.equal(next.sets, bench.sets);
  assert.equal(next.cue, null);
});

test('prescribeNext adds a rep at the barbell ceiling', () => {
  const bench = SESSIONS.push.lifts[0]; // 4 × 8–10 @ 135
  const next = prescribeNext(bench, { loadLb: 135, sets: 4, reps: 8 });
  assert.equal(next.source, 'progress');
  assert.equal(next.loadLb, 135);
  assert.equal(next.reps, 9);
  assert.equal(next.sets, '4 × 9');
  assert.match(next.cue, /go for 9/i);
});

test('prescribeNext holds at ceiling once the rep range is cleared', () => {
  const bench = SESSIONS.push.lifts[0];
  const next = prescribeNext(bench, { loadLb: 135, sets: 4, reps: 10 });
  assert.equal(next.source, 'hold');
  assert.equal(next.loadLb, BARBELL_MAX_LB);
  assert.equal(next.reps, 10);
  assert.match(next.cue, /eccentric/i);
});

test('prescribeNext adds load under the barbell ceiling after topping reps', () => {
  const ohp = SESSIONS.push.lifts[1]; // 4 × 8 @ 80
  const next = prescribeNext(ohp, { loadLb: 80, sets: 4, reps: 8 });
  assert.equal(next.source, 'progress');
  assert.equal(next.loadLb, 85);
  assert.equal(next.reps, 8);
  assert.equal(next.sets, '4 × 8');
  assert.match(next.cue, /add load/i);
});

test('prescribeNext climbs dumbbell steps and stops at 15', () => {
  const fly = SESSIONS.push2.lifts[2]; // 3 × 12–15 @ 15
  const mid = prescribeNext(
    { ...fly, loadLb: 10, load: '10 lb each' },
    { loadLb: 10, sets: 3, reps: 15 }
  );
  assert.equal(mid.loadLb, 15);
  assert.equal(mid.reps, 12);

  const top = prescribeNext(fly, { loadLb: 15, sets: 3, reps: 15 });
  assert.equal(top.source, 'hold');
  assert.equal(top.loadLb, DUMBBELL_MAX_LB);
  assert.match(top.cue, /ceiling|eccentric/i);
});

test('prescribeNext adds machine load with no hard ceiling', () => {
  const pulldown = SESSIONS.pull.lifts[0]; // 4 × 8 @ 145
  const next = prescribeNext(pulldown, { loadLb: 145, sets: 4, reps: 8 });
  assert.equal(next.source, 'progress');
  assert.equal(next.loadLb, 150);
  assert.equal(next.reps, 8);
});

test('prescribeNext progresses bodyweight via reps only', () => {
  const dips = SESSIONS.push.lifts[3]; // 3 × 12–15
  const next = prescribeNext(dips, { loadLb: null, sets: 3, reps: 12 });
  assert.equal(next.source, 'progress');
  assert.equal(next.loadKind, 'bodyweight');
  assert.equal(next.reps, 13);
  assert.equal(next.load, 'bodyweight');
});

test('prescribeNext leaves cardio alone', () => {
  const run = SESSIONS.run.lifts[0];
  const next = prescribeNext(run, { loadLb: null, sets: 1, reps: 30 });
  assert.equal(next.source, 'program');
  assert.equal(next.sets, run.sets);
});

if (failed) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log('\nall tests passed');
