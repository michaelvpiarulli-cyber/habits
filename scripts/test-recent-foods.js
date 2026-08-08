/**
 * Recent / frequent foods + meal-slot clock — run via npm test.
 */
import assert from 'node:assert/strict';
import {
  RECENT_FOODS_KEY,
  loadRecentFoods,
  mealSlotForHour,
  recentBoost,
  rememberFood,
  suggestRecentFoods,
} from '../src/lib/recentFoods.js';

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

const memory = new Map();
globalThis.localStorage = {
  getItem: (key) => (memory.has(key) ? memory.get(key) : null),
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: (key) => memory.delete(key),
};

console.log('recent foods');

test('mealSlotForHour maps the day', () => {
  assert.equal(mealSlotForHour(7), 'breakfast');
  assert.equal(mealSlotForHour(12), 'lunch');
  assert.equal(mealSlotForHour(18), 'dinner');
  assert.equal(mealSlotForHour(22), 'snack');
  assert.equal(mealSlotForHour(3), 'snack');
});

test('rememberFood promotes repeats and caps list', () => {
  memory.clear();
  rememberFood({
    name: 'Eggs',
    brand: 'Generic',
    serving: '2 large',
    calories: 140,
    protein: 12,
    carbs: 1,
    fat: 10,
  });
  rememberFood({
    name: 'Eggs',
    brand: 'Generic',
    serving: '2 large',
    calories: 140,
    protein: 12,
    carbs: 1,
    fat: 10,
  });
  rememberFood({
    name: 'Oats',
    brand: 'Generic',
    serving: '1 cup',
    calories: 150,
    protein: 5,
    carbs: 27,
    fat: 3,
  });
  const list = loadRecentFoods();
  assert.equal(list[0].name, 'Oats');
  assert.equal(list.find((item) => item.name === 'Eggs')?.count, 2);
  assert.ok(JSON.parse(localStorage.getItem(RECENT_FOODS_KEY)).length >= 2);
});

test('suggestRecentFoods surfaces recents first', () => {
  memory.clear();
  rememberFood({
    name: 'Chicken breast',
    serving: '100 g',
    calories: 165,
    protein: 31,
    carbs: 0,
    fat: 4,
  });
  const suggestions = suggestRecentFoods(5);
  assert.equal(suggestions[0].name, 'Chicken breast');
  assert.equal(suggestions[0].source, 'recent');
});

test('recentBoost ranks known foods', () => {
  memory.clear();
  const food = {
    name: 'Rice',
    brand: '',
    serving: '1 cup',
    calories: 200,
    protein: 4,
    carbs: 45,
    fat: 0,
  };
  assert.equal(recentBoost(food), 0);
  rememberFood(food);
  rememberFood(food);
  assert.ok(recentBoost(food) > 0);
});

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log('all recent-foods tests passed');
