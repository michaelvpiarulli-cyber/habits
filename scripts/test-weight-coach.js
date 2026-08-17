/**
 * Fat-loss coach helpers — run via npm test.
 */
import assert from 'node:assert/strict';
import {
  buildCoachAdvice,
  estimateExpenditure,
  expectedWeeklyLossLb,
  maintenanceFromWeight,
  suggestTargets,
  weeklyWeightRate,
} from '../src/lib/weightCoach.js';

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

console.log('weight coach');

test('maintenanceFromWeight scales with bodyweight', () => {
  assert.equal(maintenanceFromWeight(200), 2800);
  assert.equal(maintenanceFromWeight(0), null);
});

test('expectedWeeklyLossLb from deficit', () => {
  assert.equal(expectedWeeklyLossLb(500), 1);
  assert.equal(expectedWeeklyLossLb(350), 0.7);
});

test('suggestTargets keeps a deficit under expenditure', () => {
  const suggested = suggestTargets(
    { mode: 'lose', deficit: 400, expenditure: null },
    { expenditure: 2600, latestWeight: 200, source: 'weight' },
    185
  );
  assert.equal(suggested.calories, 2200);
  assert.ok(suggested.protein >= 160);
});

test('estimateExpenditure needs a real window', () => {
  const nutritionFor = (day) => ({
    day,
    calories: 2200,
    protein: 180,
    carbs: 180,
    fat: 70,
    meals: [],
  });
  const readings = [
    { day: '2026-07-01', weight: 200 },
    { day: '2026-07-15', weight: 198 },
  ];
  const est = estimateExpenditure({ readings, nutritionFor });
  assert.ok(est);
  assert.ok(est.expenditure > 2200);
  assert.ok(est.lbPerWeek < 0);
});

test('buildCoachAdvice surfaces day totals', () => {
  const advice = buildCoachAdvice({
    entry: { calories: 900, protein: 80, carbs: 60, fat: 30 },
    targets: { calories: 2200, protein: 185, carbs: 200, fat: 70 },
    coach: { mode: 'lose', deficit: 400 },
    expenditureInfo: { expenditure: 2600, source: 'default', latestWeight: null },
    suggested: { calories: 2200, protein: 185, carbs: 200, fat: 70 },
    viewingToday: true,
  });
  assert.equal(advice.totals.calories, 900);
  assert.match(advice.detail, /1300/);
  assert.equal(advice.targetsDiffer, false);
});

test('weeklyWeightRate is lb per week vs ~7 days earlier', () => {
  assert.equal(weeklyWeightRate([{ day: '2026-08-01', weight: 200 }]), null);
  assert.equal(
    weeklyWeightRate([
      { day: '2026-08-01', weight: 200 },
      { day: '2026-08-08', weight: 199.3 },
    ]),
    -0.7
  );
});

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log('\nall tests passed');
