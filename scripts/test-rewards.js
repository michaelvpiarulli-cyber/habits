/**
 * Closed-day treats and gold-ink unlock — run with `npm test`.
 */
import assert from 'node:assert/strict';
import { countPerfectDays, isPerfectDay } from '../src/lib/streaks.js';
import {
  applyRewardSkin,
  GOLD_AT,
  hydrateTreatsSeen,
  loadSeenTreats,
  nextTreat,
  rewardSkin,
  SEEN_KEY,
  treatJustUnlocked,
  treatsEarned,
  TREATS,
} from '../src/lib/rewards.js';

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

function mem() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
  };
}

function habit(id, createdAt = '2026-01-01T00:00:00.000Z') {
  return { id, cadence: 'daily', weekdays: [], createdAt };
}

function doneSets(entries) {
  return new Map(entries.map(([id, days]) => [id, new Set(days)]));
}

console.log('rewards');

test('thirty is the gold-ink unlock', () => {
  assert.equal(GOLD_AT, 30);
  const thirty = TREATS.find((treat) => treat.at === 30);
  assert.equal(thirty.unlock, 'gold');
  assert.equal(rewardSkin(29), null);
  assert.equal(rewardSkin(30), 'gold');
  assert.equal(rewardSkin(100), 'gold');
});

test('treats are earned at closed-day counts, not live streaks', () => {
  assert.deepEqual(
    treatsEarned(0).map((t) => t.id),
    []
  );
  assert.deepEqual(
    treatsEarned(1).map((t) => t.id),
    ['first']
  );
  assert.deepEqual(
    treatsEarned(29).map((t) => t.id),
    ['first', 'three', 'week', 'fortnight']
  );
  assert.deepEqual(
    treatsEarned(30).map((t) => t.id),
    ['first', 'three', 'week', 'fortnight', 'thirty']
  );
  assert.equal(nextTreat(0)?.id, 'first');
  assert.equal(nextTreat(14)?.id, 'thirty');
  assert.equal(nextTreat(100), null);
});

test('countPerfectDays keeps stamps after a broken streak', () => {
  const habits = [habit('water'), habit('sleep')];
  const sets = doneSets([
    ['water', ['2026-09-01', '2026-09-02', '2026-09-04']],
    ['sleep', ['2026-09-01', '2026-09-02', '2026-09-04']],
  ]);
  assert.equal(isPerfectDay(habits, sets, '2026-09-03'), false);
  assert.equal(countPerfectDays(habits, sets, '2026-09-04'), 3);
});

test('days with nothing due do not mint a stamp', () => {
  const habits = [
    {
      id: 'gym',
      cadence: 'weekdays',
      weekdays: [0], // Monday
      createdAt: '2026-08-31T00:00:00.000Z',
    },
  ];
  const sets = doneSets([['gym', ['2026-08-31']]]);
  // Monday 31 Aug 2026 is a Monday; Tue 1 Sep is not due.
  assert.equal(isPerfectDay(habits, sets, '2026-09-01'), false);
  assert.equal(countPerfectDays(habits, sets, '2026-09-01'), 1);
});

test('hydrate marks history as seen so old work does not overlay', () => {
  const store = mem();
  const seen = hydrateTreatsSeen(14, store);
  assert.deepEqual(seen, ['first', 'three', 'week', 'fortnight']);
  assert.equal(treatJustUnlocked(14, store), null);
  const treat = treatJustUnlocked(30, store);
  assert.equal(treat.id, 'thirty');
  assert.ok(JSON.parse(store.getItem(SEEN_KEY)).includes('thirty'));
});

test('first stamp celebrates when there is no prior history', () => {
  const store = mem();
  hydrateTreatsSeen(0, store);
  assert.deepEqual(loadSeenTreats(store), []);
  const treat = treatJustUnlocked(1, store);
  assert.equal(treat.id, 'first');
  assert.equal(treatJustUnlocked(1, store), null);
});

test('applyRewardSkin writes data-reward=gold at thirty', () => {
  const attrs = {};
  const root = {
    setAttribute: (key, value) => {
      attrs[key] = value;
    },
    removeAttribute: (key) => {
      delete attrs[key];
    },
  };
  applyRewardSkin(12, root);
  assert.equal(attrs['data-reward'], undefined);
  applyRewardSkin(30, root);
  assert.equal(attrs['data-reward'], 'gold');
  applyRewardSkin(8, root);
  assert.equal(attrs['data-reward'], undefined);
});

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log('rewards ok');
