/**
 * Life OS plan, food goals, watch log, and ingest checks.
 * Run with `npm test`.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { agendaForDay } from '../src/lib/agenda.js';
import { FOOD_GOALS, foodVsGoals, preferFoodEntry } from '../src/lib/foodGoals.js';
import { extractIngestKey, keysMatch, validateIngest } from '../src/lib/ingest.js';
import { runIngest } from '../src/lib/ingestServer.js';
import { normalizeWatch, parseRating, recentWatches } from '../src/lib/watchLog.js';
import { nextWorkout, todayWorkout, workoutFor } from '../src/lib/workouts.js';

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

console.log('life os');

const names = (plan) => plan.exercises.map((exercise) => exercise.name);

test('strength alternates A/B from the Monday epoch and walks sit on Tue/Thu/Sat', () => {
  const monday = workoutFor('2024-01-01');
  assert.equal(monday.id, 'strength-a');
  assert.deepEqual(names(monday), ['Squat', 'Bench', 'Cable row', 'RDL', 'Plank']);
  assert.equal(workoutFor('2024-01-03').id, 'strength-b');
  assert.deepEqual(names(workoutFor('2024-01-03')), [
    'RDL',
    'DB shoulder press',
    'Lat pulldown',
    'Split squat',
    'Curls',
    'Pushdowns',
  ]);
  assert.equal(workoutFor('2024-01-05').id, 'strength-a');
  assert.equal(workoutFor('2024-01-08').id, 'strength-b');
  assert.equal(workoutFor('2024-01-10').id, 'strength-a');

  const walk = workoutFor('2024-01-02');
  assert.equal(walk.id, 'walk');
  assert.equal(walk.startTime, '07:00');
  assert.equal(walk.endTime, '08:00');
  assert.equal(workoutFor('2024-01-04').id, 'walk');
  assert.equal(workoutFor('2024-01-06').id, 'walk');
  assert.equal(workoutFor('2024-01-07').kind, 'rest');
  assert.equal(todayWorkout('2024-01-01').name, 'Strength A');
});

test('next workout skips rest and is the following training day', () => {
  const afterSunday = nextWorkout('2024-01-07');
  assert.equal(afterSunday.day, '2024-01-08');
  assert.equal(afterSunday.id, 'strength-b');
  assert.equal(nextWorkout('2024-01-01').day, '2024-01-02');
  assert.equal(nextWorkout('2024-01-01').id, 'walk');
});

test('food prefers the newer total and scores 2100 kcal / 210 g', () => {
  assert.equal(FOOD_GOALS.calories, 2100);
  assert.equal(FOOD_GOALS.protein, 210);
  const ingest = preferFoodEntry(
    { calories: 1800, protein: 160, updatedAt: '2026-10-19T18:00:00.000Z' },
    { calories: 900, protein: 40, updatedAt: '2026-10-19T12:00:00.000Z', meals: [{ id: 'm' }] }
  );
  assert.equal(ingest.source, 'ingest');
  assert.equal(ingest.calories, 1800);
  const logged = preferFoodEntry(
    { calories: 1800, protein: 160, updatedAt: '2026-10-19T08:00:00.000Z' },
    { calories: 900, protein: 40, updatedAt: '2026-10-19T12:00:00.000Z' }
  );
  assert.equal(logged.source, 'log');
  assert.equal(preferFoodEntry({ calories: 0, protein: 0, meals: [] }, null), null);
  const stats = foodVsGoals({ calories: 1050, protein: 105 });
  assert.equal(stats.calorieRatio, 0.5);
  assert.equal(stats.proteinRatio, 0.5);
});

test('watch entries clamp stars and sort recent first', () => {
  assert.equal(parseRating(1), 1);
  assert.equal(parseRating(5), 5);
  assert.equal(parseRating(0), null);
  assert.equal(parseRating(6), null);
  assert.equal(parseRating(3.5), null);
  assert.match(normalizeWatch({ title: '  ' }).error, /title/i);
  assert.match(normalizeWatch({ title: 'Talk', rating: 9 }).error, /1 to 5/);
  assert.match(normalizeWatch({ title: 'Talk', link: 'youtube.com' }).error, /http/);
  const saved = normalizeWatch({
    title: '  A talk  ',
    link: 'https://example.com/v',
    watchedOn: '2026-10-19',
    rating: 4,
    notes: 'Notes',
  });
  assert.equal(saved.value.title, 'A talk');
  assert.equal(saved.value.rating, 4);
  const recent = recentWatches(
    [
      { id: 'old', title: 'Old', watchedOn: '2026-10-01', updatedAt: '2', deleted: false },
      { id: 'new', title: 'New', watchedOn: '2026-10-18', updatedAt: '1', deleted: false },
      { id: 'gone', title: 'Gone', watchedOn: '2026-10-19', updatedAt: '9', deleted: true },
    ],
    1
  );
  assert.deepEqual(recent.map((entry) => entry.id), ['new']);
});

test('agenda mixes local events and Google events for the day', () => {
  const items = agendaForDay(
    [
      { id: '1', title: 'Dentist', day: '2026-10-19', startTime: '15:00', deleted: false },
      { id: '2', title: 'Other day', day: '2026-10-20', startTime: '09:00', deleted: false },
    ],
    [{ id: 'g1', title: 'Standup', day: '2026-10-19', startTime: '09:00', allDay: false, href: 'https://calendar.google.com' }],
    '2026-10-19'
  );
  assert.deepEqual(
    items.map((item) => item.title),
    ['Standup', 'Dentist']
  );
  assert.equal(items[0].source, 'google');
});

test('ingest rejects a bad key, a rest day, and a missing owner', async () => {
  assert.equal(extractIngestKey({ Authorization: 'Bearer secret-key' }), 'secret-key');
  assert.equal(extractIngestKey({ 'x-tally-ingest-key': 'other' }), 'other');
  assert.equal(keysMatch('secret-key', 'secret-key'), true);
  assert.equal(keysMatch('secret-key', 'secret-kez'), false);

  const missing = await runIngest({
    method: 'POST',
    headers: { authorization: 'Bearer secret-key' },
    body: { kind: 'nutrition', date: '2026-10-19', calories: 1 },
    env: {},
  });
  assert.equal(missing.status, 503);

  const writes = [];
  const store = {
    async ownerId() {
      return 'owner-1';
    },
    async write(ownerId, value) {
      writes.push({ ownerId, value });
      return { ok: true, kind: value.kind, day: value.date };
    },
  };
  const denied = await runIngest({
    method: 'POST',
    headers: { authorization: 'Bearer nope' },
    body: { kind: 'nutrition', date: '2026-10-19', protein: 10 },
    env: { TALLY_INGEST_KEY: 'secret-key' },
    store,
  });
  assert.equal(denied.status, 401);
  assert.equal(writes.length, 0);

  const badDate = validateIngest({ kind: 'nutrition', date: '2026-02-31', calories: 1 });
  assert.equal(badDate.ok, false);

  const rest = await runIngest({
    method: 'POST',
    headers: { 'x-tally-ingest-key': 'secret-key' },
    body: { kind: 'workout', date: '2024-01-07', done: true },
    env: { TALLY_INGEST_KEY: 'secret-key' },
    store,
  });
  assert.equal(rest.status, 400);

  const saved = await runIngest({
    method: 'POST',
    headers: { authorization: 'Bearer secret-key' },
    body: {
      kind: 'nutrition',
      date: '2026-10-19',
      calories: 1800,
      protein: 160,
      carbs: 90,
      fat: 40,
      meals: [{ name: 'Lunch', calories: 700, protein: 40 }],
      user_id: 'attacker',
    },
    env: { TALLY_INGEST_KEY: 'secret-key' },
    store,
  });
  assert.equal(saved.status, 200);
  assert.equal(writes[0].ownerId, 'owner-1');
  assert.equal(writes[0].value.calories, 1800);
  assert.equal(writes[0].value.protein, 160);
  assert.equal(writes[0].value.meals[0].name, 'Lunch');
  assert.equal(writes[0].value.user_id, undefined);

  const workout = await runIngest({
    method: 'POST',
    headers: { authorization: 'Bearer secret-key' },
    body: { kind: 'workout', day: '2024-01-01' },
    env: { TALLY_INGEST_KEY: 'secret-key' },
    store,
  });
  assert.equal(workout.status, 200);
  assert.equal(writes[1].value.planId, 'strength-a');
  assert.equal(writes[1].value.done, true);

  const unowned = await runIngest({
    method: 'POST',
    headers: { authorization: 'Bearer secret-key' },
    body: { kind: 'workout', date: '2024-01-02', done: true },
    env: { TALLY_INGEST_KEY: 'secret-key' },
    store: {
      async ownerId() {
        return null;
      },
      async write() {
        throw new Error('should not write');
      },
    },
  });
  assert.equal(unowned.status, 409);
});

test('life os SQL is owner-only and the ingest lookup is service-role only', () => {
  const sql = fs.readFileSync(new URL('../supabase/add-life-os.sql', import.meta.url), 'utf8');
  const lock = fs.readFileSync(new URL('../supabase/lock-owner-rls.sql', import.meta.url), 'utf8');
  for (const table of ['daily_nutrition', 'workout_logs', 'watch_entries']) {
    assert.match(sql, new RegExp(table));
    assert.match(lock, new RegExp(`'${table}'`));
  }
  assert.match(sql, /to authenticated using \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.match(sql, /with check \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.match(sql, /revoke all on function public\.life_os_owner_id\(\) from public, anon, authenticated/);
  assert.match(sql, /grant execute on function public\.life_os_owner_id\(\) to service_role/);
  assert.match(lock, /revoke all on function public\.life_os_owner_id\(\) from public, anon, authenticated/);
  assert.doesNotMatch(sql, /using \(true\)/i);
  assert.doesNotMatch(sql, /to anon, authenticated/);
});

await Promise.all(queue);

if (failed) {
  console.error(`\n${failed} life os test(s) failed`);
  process.exit(1);
}
console.log('life os ok');
