/**
 * M'Cheyne calendar: passages, leap-day catch-up, and checkmarks.
 */
import assert from 'node:assert/strict';
import {
  PLAN_LENGTH,
  isDayComplete,
  missedDays,
  planIndexForDate,
  readingsForDate,
  readingsForIndex,
  toggleSlot,
  withDayComplete,
  yearProgress,
} from '../src/lib/biblePlan.js';

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

console.log('bible');

test('the public-domain calendar has 365 days and the classic endpoints', () => {
  assert.equal(PLAN_LENGTH, 365);
  assert.equal(readingsForIndex(0)[0].ref, 'Genesis 1');
  assert.equal(readingsForIndex(0)[1].ref, 'Matthew 1');
  assert.equal(readingsForIndex(0)[2].ref, 'Ezra 1');
  assert.equal(readingsForIndex(0)[3].ref, 'Acts 1');
  const last = readingsForIndex(364);
  assert.equal(last[0].ref, '2 Chronicles 36');
  assert.equal(last[1].ref, 'Revelation 22');
  assert.equal(last[2].ref, 'Malachi 4');
  assert.equal(last[3].ref, 'John 21');
});

test('dates stay aligned and 29 Feb is a catch-up day', () => {
  assert.equal(planIndexForDate('2026-01-01'), 0);
  assert.equal(planIndexForDate('2026-03-01'), 59);
  assert.equal(planIndexForDate('2024-02-29'), null);
  assert.equal(planIndexForDate('2024-03-01'), 59);
  assert.equal(readingsForDate('2024-02-29').catchUpDay, true);
  assert.equal(planIndexForDate('2026-12-31'), 364);
  assert.equal(planIndexForDate('2024-12-31'), 364);
});

test('checks, progress, and missed days', () => {
  let checks = {};
  checks = toggleSlot(checks, 2026, 0, 0, 't1');
  assert.equal(isDayComplete(checks, 2026, 0), false);
  checks = withDayComplete(checks, 2026, 0, 't2');
  assert.equal(isDayComplete(checks, 2026, 0), true);
  const missed = missedDays(checks, '2026-01-03');
  assert.deepEqual(missed.map((day) => day.iso), ['2026-01-02']);
  const progress = yearProgress(checks, '2026-01-03');
  assert.equal(progress.done, 1);
  assert.equal(progress.elapsed, 3);
  assert.equal(progress.behind, 2);
  assert.equal(progress.yearDone, 1);
});

if (failed) {
  console.error(`\n${failed} bible test(s) failed`);
  process.exit(1);
}
console.log('bible ok');
