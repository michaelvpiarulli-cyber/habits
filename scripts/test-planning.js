/**
 * Planning overview helpers — run with `npm test`.
 */
import assert from 'node:assert/strict';
import {
  focusTodos,
  openBoardPulse,
  planningPulse,
  WORKSPACE_PAGES,
} from '../src/lib/planning.js';

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

console.log('planning');

const stamp = (id, extra = {}) => ({
  id,
  deleted: false,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  ...extra,
});

test('openBoardPulse skips done and respects limit', () => {
  const cards = [
    stamp('a', { title: 'A', column: 'backlog', sortOrder: 0 }),
    stamp('b', { title: 'B', column: 'doing', sortOrder: 0 }),
    stamp('c', { title: 'C', column: 'done', sortOrder: 0 }),
    stamp('d', { title: 'D', column: 'backlog', sortOrder: 1 }),
  ];
  const pulse = openBoardPulse(cards, 2);
  assert.deepEqual(
    pulse.map((c) => c.id),
    ['a', 'd']
  );
  assert.equal(openBoardPulse(cards, Infinity).length, 3);
});

test('focusTodos orders overdue then today then upcoming', () => {
  const todos = focusTodos(
    [
      stamp('later', { title: 'Later', dueDate: null, done: false }),
      stamp('soon', { title: 'Soon', dueDate: '2026-08-20', done: false }),
      stamp('now', { title: 'Now', dueDate: '2026-08-16', done: false }),
      stamp('late', { title: 'Late', dueDate: '2026-08-01', done: false }),
      stamp('done', { title: 'Done', dueDate: '2026-08-16', done: true }),
    ],
    '2026-08-16',
    3
  );
  assert.deepEqual(
    todos.map((t) => t.id),
    ['late', 'now', 'soon']
  );
});

test('planningPulse summary joins live counts', () => {
  const pulse = planningPulse({
    notes: [stamp('n1', { title: 'One', archived: false })],
    tasks: [
      stamp('t1', { title: 'Todo', done: false }),
      stamp('t2', { title: 'Done', done: true }),
    ],
    books: [stamp('b1', { title: 'Book', status: 'reading' })],
    boardCards: [stamp('c1', { title: 'Card', column: 'doing' })],
  });
  assert.equal(pulse.pageCount, 1);
  assert.equal(pulse.openTodos, 1);
  assert.equal(pulse.reading, 1);
  assert.equal(pulse.boardOpen, 1);
  assert.match(pulse.summary, /1 page/);
  assert.match(pulse.summary, /1 todo/);
  assert.match(pulse.summary, /1 reading/);
  assert.match(pulse.summary, /1 on board/);
});

test('WORKSPACE_PAGES covers primary planning surfaces', () => {
  for (const id of ['notes', 'boards', 'tasks', 'books', 'habits']) {
    assert.equal(WORKSPACE_PAGES.has(id), true);
  }
});

if (failed) {
  console.error(`\n${failed} planning test(s) failed`);
  process.exit(1);
}
console.log('planning ok');
