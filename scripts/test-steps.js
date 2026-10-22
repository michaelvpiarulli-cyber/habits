/**
 * Steps ingest and the Monday to Sunday review.
 * Run with `npm test`.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { sha256Hex } from '../src/lib/ingestAuth.js';
import { validateIngest } from '../src/lib/ingest.js';
import { runIngest } from '../src/lib/ingestServer.js';
import { HOUSEHOLD_OWNER_ID } from '../src/lib/household.js';
import { formatStepCount, stepsOnDay } from '../src/lib/steps.js';
import {
  habitWeekCount,
  searchForWeek,
  tasksCompletedInWeek,
  weekDays,
  weekFood,
  weekLabel,
  weekStartFor,
  weekSteps,
  weekWorkouts,
} from '../src/lib/weekReview.js';

const rounded = validateIngest({ kind: 'steps', date: '2020-02-02', steps: 8420.6 });
assert.equal(rounded.ok, true);
assert.equal(rounded.value.steps, 8421);
assert.equal(rounded.value.date, '2020-02-02');
assert.equal(validateIngest({ kind: 'steps', date: '2020-02-02', steps: 0 }).value.steps, 0);
assert.equal(validateIngest({ kind: 'steps', date: '2020-02-02', steps: -1 }).ok, false);
assert.equal(validateIngest({ kind: 'steps', date: '2020-02-02', steps: 200001 }).ok, false);
assert.equal(validateIngest({ kind: 'steps', date: '2020-02-02', steps: 'many' }).ok, false);
assert.match(validateIngest({ kind: 'sleep', date: '2020-02-02' }).error, /steps/);

const stepsHash = sha256Hex('steps-secret');
const foodHash = sha256Hex('food-secret');
const writes = [];
const store = {
  async write(ownerId, value) {
    writes.push({ ownerId, value });
    return { ok: true, kind: value.kind, day: value.date, steps: value.steps };
  },
};

const foodKeyOnSteps = await runIngest({
  method: 'POST',
  headers: { 'x-tally-ingest-key': 'food-secret' },
  body: { kind: 'steps', date: '2020-02-02', steps: 12000 },
  env: { TALLY_INGEST_KEY: 'food-secret' },
  lookupHash: async () => foodHash,
  lookupStepsHash: async () => stepsHash,
  store,
});
assert.equal(foodKeyOnSteps.status, 401);
assert.equal(writes.length, 0);

const wrong = await runIngest({
  method: 'POST',
  headers: { authorization: 'Bearer nope' },
  body: { kind: 'steps', date: '2020-02-02', steps: 1000 },
  env: {},
  lookupStepsHash: async () => stepsHash,
  store,
});
assert.equal(wrong.status, 401);

const saved = await runIngest({
  method: 'POST',
  headers: { 'x-tally-ingest-key': 'steps-secret' },
  body: { kind: 'steps', date: '2020-02-02', steps: 10000 },
  env: { TALLY_INGEST_KEY: 'food-secret' },
  lookupHash: async () => foodHash,
  lookupStepsHash: async () => stepsHash,
  store,
});
assert.equal(saved.status, 200);
assert.equal(writes.length, 1);
assert.equal(writes[0].ownerId, HOUSEHOLD_OWNER_ID);
assert.equal(writes[0].value.kind, 'steps');
assert.equal(writes[0].value.steps, 10000);

const stepsKeyOnFood = await runIngest({
  method: 'POST',
  headers: { 'x-tally-ingest-key': 'steps-secret' },
  body: { kind: 'nutrition', date: '2020-02-02', calories: 1 },
  env: {},
  lookupHash: async () => foodHash,
  lookupStepsHash: async () => stepsHash,
  store,
});
assert.equal(stepsKeyOnFood.status, 401);
assert.equal(writes.length, 1);

const missingSteps = await runIngest({
  method: 'POST',
  headers: { 'x-tally-ingest-key': 'steps-secret' },
  body: { kind: 'steps', date: '2020-02-02', steps: 1 },
  env: { TALLY_INGEST_KEY: 'steps-secret' },
  lookupStepsHash: async () => null,
  store,
});
assert.equal(missingSteps.status, 503);
assert.equal(writes.length, 1);

const today = '2026-10-22';
assert.equal(weekStartFor('2026-10-25', today), '2026-10-19');
assert.equal(weekStartFor('2026-11-02', today), '2026-10-19');
assert.equal(weekStartFor('2026-10-12', today), '2026-10-12');
assert.equal(searchForWeek('?date=2026-10-20', '2026-10-22', today), '?date=2026-10-20');
assert.equal(searchForWeek('?date=2026-10-20', '2026-10-12', today), '?date=2026-10-20&week=2026-10-12');
assert.equal(weekLabel('2026-10-19'), 'Mon 19 Oct to Sun 25 Oct');

const days = weekDays('2026-10-19');
assert.deepEqual([days[0], days[6]], ['2026-10-19', '2026-10-25']);
const grid = habitWeekCount(days, new Set(['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-24']));
assert.equal(grid.count, 5);
assert.equal(grid.total, 7);
assert.deepEqual(grid.marks, [true, true, true, true, false, true, false]);

const food = weekFood(
  [
    { day: '2026-10-20', calories: 1739, protein: 108, source: 'jeno', deleted: false, updatedAt: '2026-10-20T12:00:00Z' },
    { day: '2026-10-21', calories: 404, protein: 0, source: 'jeno', deleted: false, updatedAt: '2026-10-21T12:00:00Z' },
    { day: '2026-10-19', calories: 0, protein: 0, deleted: false },
  ],
  [],
  days
);
assert.equal(food.loggedDays, 2);
assert.equal(food.average, Math.round((1739 + 404) / 2));
assert.equal(food.goal, 2100);
assert.equal(food.proteinAverage, 108);
assert.equal(food.rows[0].calories, null);
assert.equal(food.rows[1].calories, 1739);
assert.equal(
  weekFood([{ day: '2026-10-20', calories: 100, protein: 0, source: 'jeno', deleted: false }], [], days).proteinAverage,
  null
);

assert.equal(weekSteps([], days), null);
assert.equal(weekSteps([{ day: '2026-10-22', steps: 8421, deleted: true }], days), null);
const steps = weekSteps([{ day: '2026-10-22', steps: 8421, deleted: false }], days);
assert.equal(steps[3].steps, 8421);
assert.equal(steps[0].steps, null);
assert.equal(formatStepCount(8421), '8,421');
assert.equal(stepsOnDay([{ day: '2026-10-22', steps: 10, deleted: true }], '2026-10-22'), null);

const doneTasks = tasksCompletedInWeek(
  [
    { id: '1', title: 'In week', done: true, completedAt: '2026-10-20T15:00:00Z', dueDate: '2026-09-01', deleted: false },
    { id: '2', title: 'Other week', done: true, completedAt: '2026-10-01T15:00:00Z', dueDate: '2026-10-20', deleted: false },
    { id: '3', title: 'Due only', done: true, completedAt: null, dueDate: '2026-10-21', deleted: false },
    { id: '4', title: 'Open', done: false, dueDate: '2026-10-21', deleted: false },
    { id: '5', title: 'Gone', done: true, completedAt: '2026-10-21', deleted: true },
  ],
  days
);
assert.deepEqual(doneTasks.map((task) => task.id), ['1', '3']);

const workouts = weekWorkouts(
  [{ id: 'w1', name: 'Strength A', days: [0, 2, 4], deleted: false, dates: [], pattern: 'weekly' }],
  [{ day: '2026-10-19', done: true, deleted: false }],
  days
);
assert.equal(workouts.scheduled, 3);
assert.equal(workouts.done, 1);
assert.equal(workouts.items[0].done, true);
assert.equal(workouts.items[1].done, false);

const sql = fs.readFileSync(new URL('../supabase/add-steps.sql', import.meta.url), 'utf8');
assert.match(sql, /check_steps_key/);
assert.equal(sql.includes('check_ingest_key'), false);
assert.match(sql, /p_steps >= 10000/);
assert.equal(/delete\s+from/i.test(sql), false);
assert.match(sql, /name = 'steps_key'/);
assert.equal(sql.includes("name = 'ingest_key'"), false);
assert.match(sql, /revoke all on function public\.reveal_steps_key\(\) from public/);
assert.match(sql, /grant execute on function public\.ingest_steps\(text, date, integer\) to anon, authenticated, service_role/);

console.log('steps and week checks passed');
