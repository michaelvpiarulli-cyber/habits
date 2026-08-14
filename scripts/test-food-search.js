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
  assert.ok(COMMON_FOODS.length >= 1200, `expected >=1200 foods, got ${COMMON_FOODS.length}`);
});

test('new chains land in the local library', () => {
  assert.ok(searchLocalFoods('wendys baconator').some((h) => /baconator/i.test(h.name)));
  assert.ok(searchLocalFoods('whopper').some((h) => /whopper/i.test(h.name)));
  assert.ok(searchLocalFoods('popeyes sandwich').length >= 1);
  assert.ok(searchLocalFoods('panda orange chicken').some((h) => /orange chicken/i.test(h.name)));
  assert.ok(searchLocalFoods('wahoos fish taco').some((h) => /fish taco/i.test(h.name)));
  assert.ok(searchLocalFoods('raising canes').length >= 1);
  assert.ok(searchLocalFoods('doritos').length >= 1);
  assert.ok(searchLocalFoods('jersey mikes').length >= 3);
  assert.ok(searchLocalFoods('cava chicken').length >= 1);
  assert.ok(searchLocalFoods('sweetgreen harvest').some((h) => /harvest/i.test(h.name)));
  assert.ok(searchLocalFoods('culvers butterburger').length >= 1);
  assert.ok(searchLocalFoods('gold standard').some((h) => /whey/i.test(h.name)));
});

test('search synonyms beat MFP typing friction', () => {
  assert.ok(searchLocalFoods('pb').some((h) => /peanut butter/i.test(h.name)));
  assert.ok(searchLocalFoods('cfa').some((h) => /chick-fil-a/i.test(h.brand)));
  assert.ok(searchLocalFoods('bww').length >= 1);
  assert.ok(searchLocalFoods('100g chicken').some((h) => /chicken/i.test(h.name)));
});

test('ranking prefers the food you meant', () => {
  const chicken = searchLocalFoods('chicken');
  assert.ok(chicken.length >= 1);
  assert.match(chicken[0].name, /chicken breast/i);

  const fries = searchLocalFoods('mcd fries');
  assert.ok(fries.some((h) => /fries/i.test(h.name) && /mcdonald/i.test(h.brand)));
  assert.match(fries[0].name, /fries/i);

  const yogurt = searchLocalFoods('greek yogurt');
  assert.ok(yogurt.length >= 1);
  assert.match(yogurt[0].name, /yogurt/i);

  const toast = searchLocalFoods('avocado toast');
  assert.ok(toast.length >= 1);
  assert.match(toast[0].name, /avocado toast/i);

  const banana = searchLocalFoods('banana');
  assert.ok(banana.length >= 1);
  assert.match(banana[0].name, /^banana$/i);
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

test('mcdonalds chipotle and chick-fil-a search', () => {
  assert.ok(searchLocalFoods('mcdonalds big mac').some((h) => /big mac/i.test(h.name)));
  assert.ok(searchLocalFoods('chipotle chicken').length >= 1);
  assert.ok(searchLocalFoods('chick fil a nuggets').some((h) => /nugget/i.test(h.name)));
  assert.ok(searchLocalFoods('starbucks latte').length >= 1);
});

test('wahoos fish tacos are in the local library', () => {
  const hits = searchLocalFoods('wahood');
  assert.ok(hits.length >= 3, `expected Wahoo's hits for wahood, got ${hits.length}`);
  assert.ok(hits.every((hit) => /wahoo/i.test(hit.brand)));
  const fish = searchLocalFoods('wahoo fish taco');
  assert.ok(fish.some((hit) => /fish/i.test(hit.name)));
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
