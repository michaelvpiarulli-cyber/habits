/**
 * Personal food library + Open Food Facts mapper — run via npm test.
 */
import assert from 'node:assert/strict';
import { FOOD_LIBRARY_KEY, FOOD_UNIVERSE, loadFoodLibrary, rememberLibraryFoods } from '../src/lib/foodLibrary.js';
import { mapOpenFoodFactsHit } from '../src/lib/openFoodFacts.js';
import { searchLocalFoods } from '../src/lib/foodSearch.js';

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

console.log('food library / million-scale search');

test('FOOD_UNIVERSE is million-scale', () => {
  assert.ok(FOOD_UNIVERSE.totalApprox >= 1_000_000);
  assert.match(FOOD_UNIVERSE.label, /M/);
});

test('mapOpenFoodFactsHit reads search-a-licious nutriments', () => {
  const mapped = mapOpenFoodFactsHit({
    code: '123',
    product_name: 'Test Yogurt',
    brands: ['Oikos'],
    nutriments: {
      'energy-kcal_100g': 80,
      proteins_100g: 15,
      carbohydrates_100g: 5,
      fat_100g: 0.5,
    },
  });
  assert.equal(mapped.name, 'Test Yogurt');
  assert.equal(mapped.brand, 'Oikos');
  assert.equal(mapped.calories, 80);
  assert.equal(mapped.protein, 15);
  assert.equal(mapped.source, 'off');
  assert.equal(mapped.serving, '100 g');
});

test('mapOpenFoodFactsHit converts kJ when kcal is missing', () => {
  const mapped = mapOpenFoodFactsHit({
    code: '456',
    product_name: 'Kj Only Yogurt',
    brands: 'Chobani',
    nutriments: {
      'energy-kj_100g': 361,
      proteins_100g: 8.1,
      carbohydrates_100g: 10.5,
      fat_100g: 1.3,
    },
  });
  assert.ok(mapped.calories >= 85 && mapped.calories <= 87, `got ${mapped.calories}`);
});

test('rememberLibraryFoods makes remote foods searchable offline', () => {
  memory.clear();
  rememberLibraryFoods([
    {
      id: 'off-999',
      name: 'Zesty Unique Protein Bar XYZ',
      brand: 'MegaBrand',
      serving: '1 bar',
      calories: 200,
      protein: 20,
      carbs: 22,
      fat: 7,
      source: 'off',
    },
  ]);
  assert.ok(loadFoodLibrary().some((f) => /Zesty Unique/i.test(f.name)));
  assert.ok(JSON.parse(localStorage.getItem(FOOD_LIBRARY_KEY)).length >= 1);
  const hits = searchLocalFoods('Zesty Unique Protein');
  assert.ok(hits.some((h) => /Zesty Unique/i.test(h.name)));
});

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log('all food-library tests passed');
