/**
 * Cold-start food suggestions — run via npm test.
 */
import assert from 'node:assert/strict';
import { starterFoods } from '../src/lib/starterFoods.js';

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

console.log('starter foods');

test('starterFoods returns tap-ready commons', () => {
  const list = starterFoods();
  assert.ok(list.length >= 5, `expected several starters, got ${list.length}`);
  assert.ok(list.every((food) => food.name && food.calories >= 0));
  assert.ok(list.some((food) => /chicken|egg|yogurt|oat|banana/i.test(food.name)));
});

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log('all starter-foods tests passed');
