/**
 * Menu courses for Today — run with `npm test`.
 */
import assert from 'node:assert/strict';
import { STARTER_HABITS, daypartOf, groupByDaypart } from '../src/lib/habits.js';
import {
  COURSES,
  courseOf,
  groupByCourse,
  inferCourse,
  keepLocalCourses,
} from '../src/lib/menu.js';

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

console.log('menu');

test('starter set lands on the menu in the right courses', () => {
  const grouped = groupByCourse(STARTER_HABITS);
  const ids = (course) => grouped.find((g) => g.id === course)?.habits.map((h) => h.name) || [];
  assert.deepEqual(ids('starter'), ['Weigh in']);
  assert.deepEqual(ids('main'), ['Whole foods', 'Sleep', 'Protein']);
  assert.deepEqual(ids('side'), ['Walk after meals']);
  assert.equal(grouped.some((g) => g.id === 'dessert'), false);
});

test('a stored course beats inference', () => {
  const habit = { ...STARTER_HABITS[4], course: 'dessert' };
  assert.equal(courseOf(habit), 'dessert');
});

test('an unknown stored course falls back to inference', () => {
  const habit = { ...STARTER_HABITS[4], course: 'appetizer' };
  assert.equal(courseOf(habit), 'starter');
});

test('check habits default to starters, amounts to mains, weekly to specials', () => {
  assert.equal(inferCourse({ name: 'Cold shower', kind: 'check', cadence: 'daily' }), 'starter');
  assert.equal(inferCourse({ name: 'Sleep extra', kind: 'amount', cadence: 'daily' }), 'main');
  assert.equal(inferCourse({ name: 'Long run', kind: 'count', cadence: 'per_week' }), 'special');
});

test('dessert and special names are recognised', () => {
  assert.equal(inferCourse({ name: 'Watch a movie', kind: 'check', cadence: 'daily' }), 'dessert');
  assert.equal(inferCourse({ name: 'Take a vacation', kind: 'check', cadence: 'daily' }), 'special');
});

test('empty courses stay off the ticket', () => {
  const grouped = groupByCourse([{ id: '1', name: 'Protein', kind: 'amount', cadence: 'daily' }]);
  assert.deepEqual(grouped.map((g) => g.id), ['main']);
});

test('keepLocalCourses copies a local course onto a newer remote row', () => {
  const local = [{ id: 'a', name: 'Walk', course: 'side', updatedAt: '2026-01-01' }];
  const merged = [{ id: 'a', name: 'Walk after lunch', updatedAt: '2026-02-01' }];
  const next = keepLocalCourses(merged, local);
  assert.equal(next[0].course, 'side');
  assert.equal(next[0].name, 'Walk after lunch');
});

test('keepLocalCourses does not invent a course', () => {
  const next = keepLocalCourses([{ id: 'a', name: 'Walk' }], [{ id: 'a', name: 'Walk' }]);
  assert.equal(next[0].course, undefined);
});

test('five courses, in ticket order', () => {
  assert.deepEqual(
    COURSES.map((c) => c.name),
    ['Starters', 'Mains', 'Sides', 'Desserts', 'Specials']
  );
});

test('dayparts stay a single list until a habit already has one', () => {
  assert.equal(daypartOf({ cue: 'Morning' }), 'morning');
  assert.equal(daypartOf({ cue: 'after coffee' }), '');
  assert.equal(daypartOf({ name: 'Sleep' }), '');
  const flat = groupByDaypart([{ id: 'a', name: 'Sleep' }, { id: 'b', name: 'Weigh in' }]);
  assert.equal(flat.length, 1);
  assert.equal(flat[0].label, '');
  assert.equal(flat[0].habits.length, 2);
  const grouped = groupByDaypart([
    { id: 'a', name: 'Weigh in', cue: 'Morning' },
    { id: 'b', name: 'Read', cue: 'Evening' },
    { id: 'c', name: 'Walk' },
  ]);
  assert.deepEqual(grouped.map((group) => group.label), ['Morning', 'Anytime', 'Evening']);
  assert.deepEqual(grouped[1].habits.map((habit) => habit.id), ['c']);
});

if (failed) {
  console.error(`menu failed (${failed})`);
  process.exit(1);
}

console.log('menu ok');
