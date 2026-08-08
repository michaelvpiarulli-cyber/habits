/**
 * Local food catalog + USDA mapper — run with `npm test`.
 */
import assert from 'node:assert/strict';
import {
  parseFoodQuery,
  searchLocalFoods,
  withSearchQuantity,
} from '../src/lib/foodSearch.js';
import { mapUsdaFood } from '../src/lib/usdaFood.js';
import { COMMON_FOODS } from '../src/lib/commonFoods.js';

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

console.log('food search');

test('catalog is large enough for branded logging', () => {
  assert.ok(COMMON_FOODS.length >= 120, `expected >=120 foods, got ${COMMON_FOODS.length}`);
});

test('local search finds chicken breast with macros', () => {
  const hits = searchLocalFoods('chicken breast');
  assert.ok(hits.length >= 1);
  assert.match(hits[0].name, /chicken breast/i);
  assert.ok(hits[0].calories > 0);
  assert.ok(hits[0].protein > 0);
});

test('local search is empty for nonsense', () => {
  assert.deepEqual(searchLocalFoods('zzzznotfood'), []);
});

test('oikos yogurt is in the local library', () => {
  const hits = searchLocalFoods('oikos yogurt');
  assert.ok(hits.length >= 1, 'expected Oikos hits');
  assert.match(hits[0].name, /oikos/i);
  assert.ok(hits[0].calories > 0);
  assert.ok(hits[0].protein > 0);
});

test('del taco is in the local library', () => {
  const brandHits = searchLocalFoods('del taco');
  assert.ok(brandHits.length >= 5, `expected several Del Taco hits, got ${brandHits.length}`);
  assert.ok(brandHits.every((hit) => /del taco/i.test(hit.brand)));
  const soft = searchLocalFoods('del taco soft taco');
  assert.ok(soft.some((hit) => /soft/i.test(hit.name)));
  const burrito = searchLocalFoods('deltaco bean cheese burrito');
  assert.ok(burrito.length >= 1, 'expected bean & cheese burrito');
  assert.ok(burrito[0].calories >= 300);
});

test('parseFoodQuery reads 3 eggs', () => {
  assert.deepEqual(parseFoodQuery('3 eggs'), { quantity: 3, foodQuery: 'eggs' });
  assert.deepEqual(parseFoodQuery('2x banana'), { quantity: 2, foodQuery: 'banana' });
});

test('3 eggs finds egg and scales macros', () => {
  const hits = searchLocalFoods('3 eggs');
  assert.ok(hits.length >= 1);
  assert.match(hits[0].name, /egg/i);
  const scaled = withSearchQuantity(hits[0], 3);
  assert.equal(scaled.quantity, 3);
  assert.equal(scaled.calories, hits[0].calories * 3);
  assert.equal(scaled.baseCalories, hits[0].calories);
});

test('mapUsdaFood reads Energy kcal and macros', () => {
  const mapped = mapUsdaFood({
    fdcId: 123,
    description: 'Banana, raw',
    dataType: 'SR Legacy',
    foodNutrients: [
      { nutrientName: 'Energy', unitName: 'KCAL', value: 89 },
      { nutrientName: 'Protein', unitName: 'G', value: 1.1 },
      { nutrientName: 'Carbohydrate, by difference', unitName: 'G', value: 23 },
      { nutrientName: 'Total lipid (fat)', unitName: 'G', value: 0.3 },
    ],
  });
  assert.equal(mapped.calories, 89);
  assert.equal(mapped.protein, 1.1);
  assert.equal(mapped.carbs, 23);
  assert.equal(mapped.fat, 0.3);
  assert.equal(mapped.serving, '100 g');
});

if (failed) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log('\nall tests passed');
