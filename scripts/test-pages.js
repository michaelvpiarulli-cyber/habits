import assert from 'node:assert/strict';
import {
  breadcrumbs,
  childrenOf,
  descendantIds,
  filterCommands,
  livingBlocks,
  moveBlock,
  reorderBlocks,
  searchPages,
  slashQuery,
  sortPagesForWrite,
  withSystemPages,
} from '../src/lib/pages.js';
import { applyCollection, groupRows, matchesFilter } from '../src/lib/collectionView.js';

const pages = [
  { id: 'p1', parentId: null, title: 'Notes', icon: '📄', favorite: true, deleted: false, position: 10, systemKey: null },
  { id: 'p2', parentId: 'p1', title: 'Baby', icon: '📄', favorite: false, deleted: false, position: 0, systemKey: null },
  { id: 'gone', parentId: null, title: 'Old', deleted: true, position: 0, systemKey: null },
];

const blocks = [
  { id: 'b1', pageId: 'p2', type: 'text', content: 'crib', deleted: false, position: 1 },
  { id: 'b2', pageId: 'p2', type: 'text', content: 'mobile', deleted: false, position: 0 },
  { id: 'b3', pageId: 'p2', type: 'text', content: 'gone', deleted: true, position: 2 },
];

const shown = withSystemPages(pages);
assert.equal(shown.filter((page) => page.systemKey).length, 7);
assert.equal(shown.some((page) => page.id === 'gone'), false);

const roots = childrenOf(pages, null);
assert.ok(roots.some((page) => page.systemKey === 'today'));
assert.ok(roots.some((page) => page.id === 'p1'));
assert.deepEqual(childrenOf(pages, 'p1').map((page) => page.id), ['p2']);

assert.deepEqual(breadcrumbs(pages, 'p2').map((page) => page.id), ['p1', 'p2']);
assert.deepEqual(descendantIds(pages, 'p1'), ['p2']);
assert.equal(searchPages(pages, blocks, 'crib')[0].id, 'p2');
assert.equal(searchPages(pages, blocks, 'today')[0].systemKey, 'today');

assert.equal(slashQuery('/to'), 'to');
assert.equal(slashQuery('hello'), null);
assert.equal(filterCommands('head').length, 3);
assert.equal(filterCommands('')[0].type, 'text');

const ordered = livingBlocks(blocks, 'p2').map((block) => block.id);
assert.deepEqual(ordered, ['b2', 'b1']);
const moved = reorderBlocks(blocks, 'p2', 'b1', 'b2');
assert.deepEqual(livingBlocks(moved.blocks, 'p2').map((block) => block.id), ['b1', 'b2']);
const stepped = moveBlock(moved.blocks, 'p2', 'b1', 1);
assert.equal(livingBlocks(stepped.blocks, 'p2')[1].id, 'b1');

const written = sortPagesForWrite([
  { id: 'child', parent_id: 'parent' },
  { id: 'parent', parent_id: null },
]);
assert.deepEqual(written.map((row) => row.id), ['parent', 'child']);

const rows = [
  { id: '1', title: 'Buy milk', status: 'Open', date: '2026-10-21', tags: 'errands' },
  { id: '2', title: 'Write brief', status: 'Done', date: '2026-10-18', tags: 'work' },
];
assert.equal(matchesFilter(rows[0], { key: 'status', op: 'is', value: 'open' }), true);
assert.equal(applyCollection(rows, { query: 'milk' }).length, 1);
assert.equal(applyCollection(rows, { filters: [{ key: 'date', op: 'before', value: '2026-10-20' }] })[0].id, '2');
assert.deepEqual(
  applyCollection(rows, { sort: { key: 'title', dir: 'asc' } }).map((row) => row.id),
  ['1', '2']
);
assert.equal(groupRows(rows, 'status').length, 2);

console.log('pages ok');
