/**
 * Board column helpers — run with `npm test`.
 */
import assert from 'node:assert/strict';
import {
  BOARD_COLUMNS,
  groupBoardCards,
  nextBoardSortOrder,
  normalizeBoardColumn,
} from '../src/lib/boards.js';
import { LIFE_SPACES, QUICK_CREATES, spaceForPage } from '../src/lib/spaces.js';
import { isCoverDataUrl } from '../src/lib/covers.js';

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

console.log('boards');

const stamp = (id, extra = {}) => ({
  id,
  title: id,
  notes: '',
  column: 'backlog',
  dueDate: null,
  sortOrder: 0,
  deleted: false,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  ...extra,
});

test('normalizeBoardColumn falls back to backlog', () => {
  assert.equal(normalizeBoardColumn('doing'), 'doing');
  assert.equal(normalizeBoardColumn('nope'), 'backlog');
  assert.equal(normalizeBoardColumn(null), 'backlog');
});

test('groupBoardCards sorts by sortOrder then createdAt', () => {
  const cols = groupBoardCards([
    stamp('a', { column: 'doing', sortOrder: 2, createdAt: '2026-08-02T00:00:00.000Z' }),
    stamp('b', { column: 'doing', sortOrder: 1, createdAt: '2026-08-03T00:00:00.000Z' }),
    stamp('c', { column: 'backlog', sortOrder: 0 }),
    stamp('d', { column: 'done', sortOrder: 0, deleted: true }),
    stamp('e', { column: 'weird', sortOrder: 0 }),
  ]);
  assert.deepEqual(
    cols.map((c) => c.id),
    BOARD_COLUMNS.map(([id]) => id)
  );
  assert.deepEqual(
    cols.find((c) => c.id === 'doing').cards.map((c) => c.id),
    ['b', 'a']
  );
  assert.deepEqual(
    cols.find((c) => c.id === 'backlog').cards.map((c) => c.id),
    ['c', 'e']
  );
  assert.equal(cols.find((c) => c.id === 'done').cards.length, 0);
});

test('nextBoardSortOrder is max in column + 1', () => {
  const cards = [
    stamp('a', { column: 'backlog', sortOrder: 0 }),
    stamp('b', { column: 'backlog', sortOrder: 3 }),
    stamp('c', { column: 'doing', sortOrder: 9 }),
  ];
  assert.equal(nextBoardSortOrder(cards, 'backlog'), 4);
  assert.equal(nextBoardSortOrder(cards, 'done'), 0);
});

test('LIFE_SPACES covers planning habits-tools more-tools', () => {
  assert.deepEqual(
    LIFE_SPACES.map((s) => s.id),
    ['planning', 'habits-tools', 'more-tools']
  );
  const pages = LIFE_SPACES.flatMap((s) => s.pages.map((p) => p.id));
  for (const need of ['habits', 'tasks', 'boards', 'creativity', 'books', 'notes']) {
    assert.equal(pages.includes(need), true, `missing ${need}`);
  }
});

test('spaceForPage and QUICK_CREATES map tools into spaces', () => {
  assert.equal(spaceForPage('boards')?.id, 'planning');
  assert.equal(spaceForPage('tasks')?.id, 'planning');
  assert.equal(spaceForPage('habits')?.id, 'habits-tools');
  assert.equal(spaceForPage('nope'), null);
  assert.equal(QUICK_CREATES.length >= 4, true);
  assert.equal(
    QUICK_CREATES.every((item) => LIFE_SPACES.some((s) => s.pages.some((p) => p.id === item.id))),
    true
  );
});

test('isCoverDataUrl recognizes jpeg data urls', () => {
  assert.equal(isCoverDataUrl('data:image/jpeg;base64,abc'), true);
  assert.equal(isCoverDataUrl('https://example.com/x.jpg'), false);
  assert.equal(isCoverDataUrl(''), false);
});

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log('boards: all good\n');
