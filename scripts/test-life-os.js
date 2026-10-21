/**
 * Life OS plan, food goals, watch log, and ingest checks.
 * Run with `npm test`.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { agendaForDay } from '../src/lib/agenda.js';
import { FOOD_GOALS, foodVsGoals, preferFoodEntry } from '../src/lib/foodGoals.js';
import { applyNutritionWrite } from '../src/lib/foodLog.js';
import { inboxItems } from '../src/lib/inbox.js';
import { sha256Hex } from '../src/lib/ingestAuth.js';
import { extractIngestKey, keysMatch, validateIngest } from '../src/lib/ingest.js';
import { runIngest } from '../src/lib/ingestServer.js';
import { HOUSEHOLD_OWNER_ID } from '../src/lib/household.js';
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

test('ingest rejects a bad key and a rest day, and writes as the household', async () => {
  assert.equal(extractIngestKey({ Authorization: 'Bearer secret-key' }), 'secret-key');
  assert.equal(extractIngestKey({ 'x-tally-ingest-key': 'other' }), 'other');
  assert.equal(keysMatch('secret-key', 'secret-key'), true);
  assert.equal(keysMatch('secret-key', 'secret-kez'), false);

  const missing = await runIngest({
    method: 'POST',
    headers: { authorization: 'Bearer secret-key' },
    body: { kind: 'nutrition', date: '2026-10-19', calories: 1 },
    env: {},
    lookupHash: async () => null,
  });
  assert.equal(missing.status, 503);

  const hash = sha256Hex('file-key');
  const hashWrites = [];
  const hashStore = {
    async write(ownerId, value) {
      hashWrites.push({ ownerId, value });
      return { ok: true, kind: value.kind, day: value.date };
    },
  };
  const fromHash = await runIngest({
    method: 'POST',
    headers: { authorization: 'Bearer file-key' },
    body: { kind: 'nutrition', date: '2026-10-19', calories: 1 },
    env: {},
    lookupHash: async () => hash,
    store: hashStore,
  });
  assert.equal(fromHash.status, 200);
  assert.equal(hashWrites.length, 1);
  assert.equal(hashWrites[0].ownerId, HOUSEHOLD_OWNER_ID);

  const wrongHash = await runIngest({
    method: 'POST',
    headers: { authorization: 'Bearer other-key' },
    body: { kind: 'nutrition', date: '2026-10-19', calories: 1 },
    env: {},
    lookupHash: async () => hash,
    store: hashStore,
  });
  assert.equal(wrongHash.status, 401);
  assert.equal(hashWrites.length, 1);

  const noHeader = await runIngest({
    method: 'POST',
    headers: {},
    body: { kind: 'nutrition', date: '2026-10-19', calories: 1 },
    env: {},
    lookupHash: async () => hash,
    store: hashStore,
  });
  assert.equal(noHeader.status, 401);

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
  assert.equal(writes[0].ownerId, HOUSEHOLD_OWNER_ID);
  assert.equal(writes[0].value.calories, 1800);
  assert.equal(writes[0].value.protein, 160);
  assert.equal(writes[0].value.meals[0].name, 'Lunch');
  assert.equal(writes[0].value.user_id, undefined);

  const foods = validateIngest({
    kind: 'nutrition',
    date: '2026-10-19',
    entries: [
      { meal: 'Breakfast', name: 'Eggs', calories: 140, protein: 12, carbs: 1, fat: 10 },
      { meal: 'Breakfast', name: 'Toast', calories: 80, protein: 3, carbs: 14, fat: 1 },
      { meal: 'Lunch', name: 'Chicken', calories: 280, protein: 52, carbs: 0, fat: 6 },
    ],
  });
  assert.equal(foods.ok, true);
  assert.equal(foods.value.foodMode, 'replace');
  assert.equal(foods.value.explicit.calories, false);
  assert.equal(foods.value.meals[0].name, 'Breakfast');
  assert.equal(foods.value.meals[0].foods.length, 2);
  assert.equal(foods.value.meals[0].calories, 220);
  assert.equal(foods.value.meals[1].name, 'Lunch');
  const summed = applyNutritionWrite(null, foods.value);
  assert.equal(summed.calories, 500);
  assert.equal(summed.protein, 67);

  const kept = applyNutritionWrite(
    { calories: 500, protein: 67, carbs: 15, fat: 17, meals: foods.value.meals },
    validateIngest({ kind: 'nutrition', date: '2026-10-19', calories: 2100, protein: 180 }).value
  );
  assert.equal(kept.calories, 2100);
  assert.equal(kept.protein, 180);
  assert.equal(kept.carbs, 15);
  assert.equal(kept.fat, 17);
  assert.equal(kept.meals[0].name, 'Breakfast');

  const dayTotal = validateIngest({ kind: 'nutrition', date: '2026-10-19', calories: 1000, protein: 90 });
  assert.equal(dayTotal.ok, true);
  assert.equal(dayTotal.value.foodMode, 'totals-only');
  const firstTotal = applyNutritionWrite(null, dayTotal.value);
  assert.equal(firstTotal.calories, 1000);
  assert.equal(firstTotal.protein, 90);
  const replacedTotal = applyNutritionWrite(
    { ...firstTotal, meals: foods.value.meals },
    validateIngest({ kind: 'nutrition', date: '2026-10-19', calories: 1450 }).value
  );
  assert.equal(replacedTotal.calories, 1450);
  assert.equal(replacedTotal.protein, 90);
  assert.notEqual(replacedTotal.calories, 2450);
  assert.equal(replacedTotal.meals[0].name, 'Breakfast');

  const appended = applyNutritionWrite(
    { meals: foods.value.meals },
    validateIngest({
      kind: 'nutrition',
      date: '2026-10-19',
      mode: 'append',
      entries: [{ meal: 'Dinner', name: 'Salmon', calories: 350, protein: 34, carbs: 0, fat: 20 }],
    }).value
  );
  assert.deepEqual(appended.meals.map((meal) => meal.name), ['Breakfast', 'Lunch', 'Dinner']);
  assert.equal(appended.calories, 850);

  const inbox = inboxItems({
    activity: [
      {
        id: 'a1',
        kind: 'workout',
        action: 'updated',
        summary: 'Updated Strength A',
        detail: {},
        createdAt: '2026-10-19T12:00:00.000Z',
      },
    ],
    nutrition: [
      { day: '2026-10-18', calories: 1900, protein: 150, meals: [{ name: 'Lunch', calories: 700, protein: 40 }], updatedAt: '2026-10-18T20:00:00.000Z' },
      { day: '2026-10-19', calories: 500, protein: 67, meals: foods.value.meals, updatedAt: '2026-10-19T18:00:00.000Z' },
    ],
  });
  assert.equal(inbox[0].day, '2026-10-19');
  assert.match(inbox[0].summary, /500 kcal/);
  assert.equal(inbox[1].summary, 'Updated Strength A');

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

  const householdWrites = [];
  const unowned = await runIngest({
    method: 'POST',
    headers: { authorization: 'Bearer secret-key' },
    body: { kind: 'workout', date: '2024-01-02', done: true },
    env: { TALLY_INGEST_KEY: 'secret-key' },
    store: {
      async ownerId() {
        return null;
      },
      async write(ownerId, value) {
        householdWrites.push({ ownerId, value });
        return { ok: true, kind: value.kind, day: value.date };
      },
    },
  });
  assert.equal(unowned.status, 200);
  assert.equal(householdWrites[0].ownerId, HOUSEHOLD_OWNER_ID);
  assert.notEqual(unowned.status, 409);
});

test('life os SQL opens the new tables to the anon key', () => {
  const sql = fs.readFileSync(new URL('../supabase/add-life-os.sql', import.meta.url), 'utf8');
  for (const table of ['daily_nutrition', 'workout_logs', 'watch_entries']) {
    assert.match(sql, new RegExp(table));
  }
  assert.match(sql, /create policy "household all"/);
  assert.match(sql, /for all to anon, authenticated using \(true\) with check \(true\)/);
  assert.match(sql, /grant select, insert, update, delete on public\.%I to anon, authenticated/);
  assert.doesNotMatch(sql, /life_os_owner_id/);
  assert.doesNotMatch(sql, /private\.app_owner/);
  assert.doesNotMatch(sql, /to authenticated using \(\(select auth\.uid\(\)\) = user_id\)/);
});

test('ingest key SQL stores a hash and locks the table', () => {
  const sql = fs.readFileSync(new URL('../supabase/add-ingest-key.sql', import.meta.url), 'utf8');
  assert.match(sql, /create table if not exists public.app_secrets/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /revoke all on table public.app_secrets from anon, authenticated, public/);
  assert.match(sql, /check_ingest_key/);
  assert.match(sql, /f8ced195526e89adef759390e5404c9ded89eeb5a3fbb239b22c3d22f3d7933e/);
  assert.doesNotMatch(sql, /create policy/);
});

await Promise.all(queue);

if (failed) {
  console.error(`\n${failed} life os test(s) failed`);
  process.exit(1);
}
console.log('life os ok');
