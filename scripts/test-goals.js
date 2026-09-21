/**
 * Goals and micro-goals — run with `npm test`.
 */
import assert from 'node:assert/strict';
import {
  childrenOf,
  isHit,
  isMicro,
  keepLocalGoalNesting,
  nextProgress,
  progressOf,
  targetOf,
  topLevelGoals,
} from '../src/lib/goals.js';

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

const goal = (fields) => ({
  target: 1,
  progress: 0,
  deleted: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...fields,
});

console.log('goals');

const parent = goal({ id: 'p', title: 'Run a marathon', target: 1 });
const a = goal({ id: 'a', parentId: 'p', title: 'Run a 5K', target: 1, progress: 1 });
const b = goal({ id: 'b', parentId: 'p', title: 'Run a 10K', target: 1, progress: 0 });
const c = goal({ id: 'c', parentId: 'p', title: 'Long run', target: 4, progress: 2 });
const other = goal({ id: 'o', title: 'Read 12 books', target: 12, progress: 3 });
const list = [parent, a, b, c, other];

test('top-level goals hide the micros', () => {
  assert.deepEqual(
    topLevelGoals(list).map((g) => g.id),
    ['p', 'o']
  );
});

test('childrenOf returns micros in created order', () => {
  assert.deepEqual(
    childrenOf(list, 'p').map((g) => g.id),
    ['a', 'b', 'c']
  );
});

test('isMicro is parentId, not a separate type', () => {
  assert.equal(isMicro(parent), false);
  assert.equal(isMicro(a), true);
});

test('a parent with micros scores by how many micros are done', () => {
  assert.equal(progressOf(parent, { goals: list }), 1);
  assert.equal(targetOf(parent, list), 3);
  assert.equal(isHit(parent, progressOf(parent, { goals: list }), list), false);
});

test('a handwritten goal still uses its own counter', () => {
  assert.equal(progressOf(other, { goals: list }), 3);
  assert.equal(targetOf(other, list), 12);
});

test('a habit-linked goal reads completed days, not its micros', () => {
  const linked = goal({ id: 'p', title: 'Walk 200 days', target: 200, habitId: 'walk' });
  const step = goal({ id: 's', parentId: 'p', title: 'Buy shoes', progress: 1 });
  const doneSets = new Map([['walk', new Set(['2026-01-01', '2026-01-02'])]]);
  assert.equal(progressOf(linked, { goals: [linked, step], doneSets }), 2);
  assert.equal(targetOf(linked, [linked, step]), 200);
});

test('closing the last micro hits the parent', () => {
  const done = [parent, a, { ...b, progress: 1 }, { ...c, progress: 4 }];
  assert.equal(progressOf(parent, { goals: done }), 3);
  assert.equal(isHit(parent, 3, done), true);
});

test('deleted micros do not count', () => {
  const withGone = [parent, a, { ...b, deleted: true }, c];
  assert.equal(targetOf(parent, withGone), 2);
  assert.equal(progressOf(parent, { goals: withGone }), 1);
});

test('nextProgress steps up and wraps at the target', () => {
  assert.equal(nextProgress({ target: 1 }, 0), 1);
  assert.equal(nextProgress({ target: 1 }, 1), 0);
  assert.equal(nextProgress({ target: 4 }, 2), 3);
  assert.equal(nextProgress({ target: 4 }, 4), 0);
});

test('keepLocalGoalNesting copies a local parent onto a newer remote row', () => {
  const local = [{ id: 'a', title: '5K', parentId: 'p', updatedAt: '2026-01-01' }];
  const merged = [{ id: 'a', title: 'First 5K', updatedAt: '2026-02-01' }];
  const next = keepLocalGoalNesting(merged, local);
  assert.equal(next[0].parentId, 'p');
  assert.equal(next[0].title, 'First 5K');
});

test('keepLocalGoalNesting does not invent a parent', () => {
  const next = keepLocalGoalNesting([{ id: 'a', title: '5K' }], [{ id: 'a', title: '5K' }]);
  assert.equal(next[0].parentId, undefined);
});

if (failed) {
  console.error(`goals failed (${failed})`);
  process.exit(1);
}

console.log('goals ok');
