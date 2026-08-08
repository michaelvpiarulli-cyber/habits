/**
 * Macro target helpers — run via npm test.
 */
import assert from 'node:assert/strict';
import {
  DEFAULT_TARGETS,
  formatMacro,
  intakeOf,
  normalizeTargets,
  progressOf,
  remainingOf,
} from '../src/lib/macroTargets.js';

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

console.log('macro targets');

test('normalizeTargets fills defaults', () => {
  assert.deepEqual(normalizeTargets({}), DEFAULT_TARGETS);
});

test('remainingOf subtracts intake from targets', () => {
  const remaining = remainingOf(
    { calories: 600, protein: 40, carbs: 50, fat: 20 },
    { calories: 2200, protein: 185, carbs: 200, fat: 70 }
  );
  assert.equal(remaining.calories, 1600);
  assert.equal(remaining.protein, 145);
  assert.equal(remaining.carbs, 150);
  assert.equal(remaining.fat, 50);
});

test('progressOf can exceed 1 without clamping helper', () => {
  assert.equal(progressOf(110, 100), 1.1);
  assert.equal(progressOf(0, 100), 0);
});

test('intakeOf rounds calories', () => {
  assert.deepEqual(intakeOf({ calories: 72.4, protein: 6.33, carbs: 0, fat: 0 }), {
    calories: 72,
    protein: 6.3,
    carbs: 0,
    fat: 0,
  });
});

test('formatMacro signs positive when asked', () => {
  assert.equal(formatMacro(12, { signed: true }), '+12');
  assert.equal(formatMacro(-8, { signed: true }), '-8');
});

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log('\nall tests passed');
