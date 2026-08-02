/**
 * Meal rollups and legacy day-total migration — run with `npm test`.
 */
import assert from 'node:assert/strict';
import {
  compactMeals,
  defaultMealsForEditor,
  mealTitle,
  normalizeNutritionEntry,
  sumMacros,
  summarizeMeals,
} from '../src/lib/nutrition.js';

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

console.log('nutrition');

test('sumMacros adds meals into a day total', () => {
  assert.deepEqual(
    sumMacros([
      { calories: 400, protein: 30, carbs: 20, fat: 10 },
      { calories: 600, protein: 40, carbs: 50, fat: 15 },
    ]),
    { calories: 1000, protein: 70, carbs: 70, fat: 25 }
  );
});

test('legacy day totals become an Earlier log meal', () => {
  const normalized = normalizeNutritionEntry({
    id: 'day-1',
    day: '2026-08-01',
    calories: 1800,
    protein: 140,
    carbs: 160,
    fat: 55,
  });
  assert.equal(normalized.meals.length, 1);
  assert.equal(normalized.meals[0].slot, 'day');
  assert.equal(mealTitle(normalized.meals[0], normalized.meals), 'Earlier log');
  assert.equal(normalized.protein, 140);
});

test('empty days stay empty', () => {
  const normalized = normalizeNutritionEntry({
    id: 'day-2',
    day: '2026-08-01',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    meals: [],
  });
  assert.deepEqual(normalized.meals, []);
  assert.equal(normalized.calories, 0);
});

test('editor always offers breakfast, lunch, dinner, and a snack', () => {
  const editor = defaultMealsForEditor([]);
  assert.deepEqual(
    editor.map((meal) => meal.slot),
    ['breakfast', 'lunch', 'dinner', 'snack']
  );
  assert.equal(compactMeals(editor).length, 0);
});

test('summarizeMeals lists logged meal names', () => {
  const meals = [
    { id: '1', slot: 'breakfast', calories: 300, protein: 20, carbs: 30, fat: 10 },
    { id: '2', slot: 'dinner', calories: 700, protein: 45, carbs: 40, fat: 20 },
  ];
  assert.equal(summarizeMeals(meals), 'Breakfast · Dinner');
});

test('day totals follow the meal list, not stale top-level fields', () => {
  const normalized = normalizeNutritionEntry({
    id: 'day-3',
    day: '2026-08-01',
    calories: 9999,
    protein: 9999,
    carbs: 9999,
    fat: 9999,
    meals: [{ id: 'a', slot: 'lunch', calories: 500, protein: 35, carbs: 40, fat: 12 }],
  });
  assert.equal(normalized.calories, 500);
  assert.equal(normalized.protein, 35);
});

if (failed) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log('\nall tests passed');
