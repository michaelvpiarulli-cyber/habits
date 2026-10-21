/**
 * JENO weekly program: seed, overwrite, and the key-protected /api/program.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  SEED_A_ID,
  SEED_WALK_ID,
  formatExercise,
  patternLabel,
  visibleWorkouts,
  workoutMatchesDay,
  workoutsOnDay,
} from '../src/lib/program.js';
import { sha256Hex } from '../src/lib/ingestAuth.js';
import { runProgram } from '../src/lib/programServer.js';
import { workoutFor } from '../src/lib/workouts.js';

let failed = 0;
const queue = [];

function test(name, fn) {
  queue.push(
    Promise.resolve()
      .then(fn)
      .then(() => console.log(`  ok  ${name}`))
      .catch((err) => {
        failed += 1;
        console.error(`  FAIL  ${name}`);
        console.error(`        ${err.message}`);
      })
  );
}

function memoryStore() {
  let state = { adopted: false, workouts: [] };
  const activity = [];
  return {
    activity,
    async get() {
      return JSON.parse(JSON.stringify(state));
    },
    async save(next) {
      state = JSON.parse(JSON.stringify(next));
    },
    async log(entry) {
      activity.push(entry);
    },
  };
}

console.log('program');

test('seed alternates Strength A/B and walks Tue/Thu/Sat with placeholder loads', () => {
  const seed = visibleWorkouts({ adopted: false }).workouts;
  assert.equal(seed[0].name, 'Strength A');
  assert.deepEqual(
    seed[0].exercises.map((exercise) => exercise.name),
    ['Squat', 'Bench', 'Cable row', 'RDL', 'Plank']
  );
  assert.equal(seed[0].exercises[0].placeholder, true);
  assert.match(seed[0].exercises[0].notes, /Placeholder/);
  assert.equal(formatExercise(seed[0].exercises[0]), '3 × 8');
  assert.equal(workoutMatchesDay(seed[0], '2024-01-01'), true);
  assert.equal(workoutMatchesDay(seed[1], '2024-01-01'), false);
  assert.equal(workoutMatchesDay(seed[1], '2024-01-03'), true);
  assert.equal(workoutFor('2024-01-03').id, 'strength-b');
  assert.equal(workoutMatchesDay(seed[2], '2024-01-02'), true);
  assert.equal(seed[2].startTime, '07:00');
  assert.equal(seed[2].endTime, '08:00');
  assert.equal(workoutMatchesDay(seed[2], '2024-01-01'), false);
});

const env = { TALLY_INGEST_KEY: 'secret-key' };
const headers = { authorization: 'Bearer secret-key' };

test('program API rejects a bad key and returns the seed before JENO writes', async () => {
  const store = memoryStore();
  const denied = await runProgram({
    method: 'GET',
    headers: { authorization: 'Bearer nope' },
    env,
    store,
  });
  assert.equal(denied.status, 401);

  const hash = sha256Hex('file-key');
  const byHash = await runProgram({
    method: 'GET',
    headers: { authorization: 'Bearer file-key' },
    env: {},
    store,
    lookupHash: async () => hash,
  });
  assert.equal(byHash.status, 200);
  const wrongHash = await runProgram({
    method: 'GET',
    headers: { authorization: 'Bearer nope' },
    env: {},
    store,
    lookupHash: async () => hash,
  });
  assert.equal(wrongHash.status, 401);

  const listed = await runProgram({ method: 'GET', headers, env, store });
  assert.equal(listed.status, 200);
  assert.equal(listed.body.source, 'seed');
  assert.equal(listed.body.workouts[0].id, SEED_A_ID);
  assert.equal(store.activity.length, 0);
});

test('create materializes the seed, update and delete stick, replace overwrites', async () => {
  const store = memoryStore();
  const created = await runProgram({
    method: 'POST',
    headers,
    env,
    store,
    body: {
      name: 'Easy cardio',
      kind: 'cardio',
      days: ['Sun'],
      exercises: [{ name: 'Bike', sets: 1, reps: '20 min', notes: 'flat' }],
    },
  });
  assert.equal(created.status, 200);
  assert.equal(created.body.source, 'jeno');
  assert.equal(created.body.workouts.some((workout) => workout.name === 'Strength A'), true);
  assert.equal(created.body.workouts.some((workout) => workout.name === 'Easy cardio'), true);
  assert.match(store.activity.at(-1).summary, /Added workout Easy cardio/);

  const updated = await runProgram({
    method: 'PATCH',
    headers,
    env,
    store,
    body: {
      id: SEED_A_ID,
      exercises: [{ name: 'Squat', sets: 5, reps: '5', weight: '185 lb', rest: '3 min', notes: '' }],
    },
  });
  assert.equal(updated.status, 200);
  const squat = updated.body.workouts.find((workout) => workout.id === SEED_A_ID).exercises[0];
  assert.equal(squat.sets, 5);
  assert.equal(squat.weight, '185 lb');
  assert.equal(squat.placeholder, false);

  const removed = await runProgram({
    method: 'DELETE',
    headers,
    env,
    store,
    query: { id: SEED_WALK_ID },
  });
  assert.equal(removed.status, 200);
  assert.equal(removed.body.workouts.some((workout) => workout.id === SEED_WALK_ID), false);

  const replaced = await runProgram({
    method: 'PUT',
    headers,
    env,
    store,
    body: {
      workouts: [
        {
          name: 'Full body',
          days: ['Mon', 'Thu'],
          exercises: [{ name: 'Squat', sets: 3, reps: '5', weight: '200 lb', rest: '2 min' }],
        },
      ],
    },
  });
  assert.equal(replaced.status, 200);
  assert.deepEqual(
    replaced.body.workouts.map((workout) => workout.name),
    ['Full body']
  );
  assert.deepEqual(replaced.body.workouts[0].days, [0, 3]);
  assert.match(store.activity.at(-1).summary, /Replaced the weekly program/);

  const missing = await runProgram({
    method: 'PATCH',
    headers,
    env,
    store,
    body: { id: SEED_A_ID, name: 'Nope' },
  });
  assert.equal(missing.status, 404);
});

test('an extra date shows the workout that day and leaves the weekly days alone', () => {
  const chest = {
    id: 'c4e57da1-0c21-4411-8a11-c4e57da10001',
    name: 'Chest Day',
    days: [6],
    pattern: 'weekly',
    dates: ['2026-10-20'],
    deleted: false,
  };
  const walk = { name: 'Walk', days: [1, 3, 5], pattern: 'weekly', dates: [] };
  const core = { name: 'Core', days: [1, 3], pattern: 'weekly' };
  assert.equal(workoutMatchesDay(chest, '2026-10-20'), true);
  assert.equal(workoutMatchesDay(chest, '2026-10-25'), true);
  assert.equal(workoutMatchesDay(chest, '2026-10-27'), false);
  assert.equal(patternLabel(chest), 'Sun, plus 20 Oct');
  const tonight = workoutsOnDay([walk, chest, core], '2026-10-20').map((workout) => workout.name);
  assert.deepEqual(tonight, ['Walk', 'Chest Day', 'Core']);
  assert.deepEqual(workoutsOnDay([walk, chest, core], '2026-10-27').map((workout) => workout.name), ['Walk', 'Core']);
});

test('program API keeps one-off dates on create and later patches', async () => {
  const store = memoryStore();
  const created = await runProgram({
    method: 'POST',
    headers,
    env,
    store,
    body: {
      name: 'Chest Day',
      days: ['Sun'],
      dates: ['2026-10-20'],
      exercises: [{ name: 'Barbell bench press', sets: 4, reps: '8', weight: '95 lb', rest: '1:30' }],
    },
  });
  assert.equal(created.status, 200);
  const chest = created.body.workouts.find((workout) => workout.name === 'Chest Day');
  assert.deepEqual(chest.dates, ['2026-10-20']);
  assert.deepEqual(chest.days, [6]);
  assert.equal(workoutMatchesDay(chest, '2026-10-20'), true);

  const renamed = await runProgram({
    method: 'PATCH',
    headers,
    env,
    store,
    body: { id: chest.id, name: 'Chest Day' },
  });
  assert.equal(renamed.status, 200);
  assert.deepEqual(
    renamed.body.workouts.find((workout) => workout.id === chest.id).dates,
    ['2026-10-20']
  );

  const bad = await runProgram({
    method: 'POST',
    headers,
    env,
    store,
    body: { name: 'Oops', dates: ['Tuesday'], exercises: [{ name: 'Press', sets: 1, reps: '8' }] },
  });
  assert.equal(bad.status, 400);
});

test('readme documents the JENO program and food entry endpoints', () => {
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  assert.match(readme, /\/api\/program/);
  assert.match(readme, /dates/);
  assert.match(readme, /TALLY_INGEST_KEY/);
  assert.match(readme, /"entries"/);
  assert.match(readme, /curl/);
});

await Promise.all(queue);

if (failed) {
  console.error(`\n${failed} program test(s) failed`);
  process.exit(1);
}
console.log('program ok');
