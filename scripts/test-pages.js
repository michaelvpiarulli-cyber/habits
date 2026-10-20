import assert from 'node:assert/strict';
import {
  applyMention,
  breadcrumbs,
  childrenOf,
  descendantIds,
  filterCommands,
  livingBlocks,
  markdownShortcut,
  mentionQuery,
  mergeContent,
  moveBlock,
  pushHistory,
  reorderBlocks,
  searchPages,
  slashQuery,
  canonicalTitle,
  coercePage,
  sortPagesForWrite,
  splitContent,
  templateSpec,
  timeValue,
  withSystemPages,
} from '../src/lib/pages.js';
import { applyCollection, groupRows, matchesFilter, monthGrid, shiftMonth } from '../src/lib/collectionView.js';

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

assert.deepEqual(markdownShortcut('# '), { type: 'h1', content: '' });
assert.deepEqual(markdownShortcut('- '), { type: 'bullet', content: '' });
assert.deepEqual(markdownShortcut('[] '), { type: 'todo', content: '' });
assert.deepEqual(markdownShortcut('> '), { type: 'quote', content: '' });
assert.equal(markdownShortcut('hello'), null);
assert.equal(mentionQuery('see @tod'), 'tod');
assert.equal(applyMention('see @tod', 'Today'), 'see [[Today]] ');
assert.deepEqual(splitContent('abcd', 2), { before: 'ab', after: 'cd' });
assert.equal(mergeContent('ab', 'cd'), 'abcd');
assert.equal(templateSpec('daily', new Date('2026-10-20T12:00:00')).blocks[0].type, 'todo');
assert.equal(templateSpec('weekly').title, 'Weekly review');

const historyPage = { id: 'p2', title: 'Baby', props: {} };
const firstHistory = pushHistory(historyPage, blocks);
assert.equal(firstHistory.history.length, 1);
assert.equal(firstHistory.history[0].blocks.length, 2);
const same = pushHistory({ ...historyPage, props: firstHistory }, blocks);
assert.equal(same, firstHistory);

const grid = monthGrid('2026-10-20', [
  { id: 'a', title: 'Due', date: '2026-10-20' },
  { id: 'b', title: 'Lift', weekdays: [0] },
]);
assert.equal(grid.cells.filter(Boolean).length, 31);
assert.ok(grid.cells.find((cell) => cell?.iso === '2026-10-20').items.some((row) => row.id === 'a'));
assert.equal(shiftMonth('2026-10-01', 1), '2026-11-01');
assert.equal(canonicalTitle({ systemKey: 'log', title: 'Renamed' }), 'Log');
assert.equal(coercePage({ systemKey: 'today', title: 'Nope' }).title, 'Today');
assert.equal(coercePage({ title: 'Notes' }).title, 'Notes');
assert.ok(timeValue('2026-10-20T20:03:24.583762+00:00') > timeValue('2026-10-20T20:02:59.652Z'));
assert.ok(timeValue('2026-10-20 20:03:24.583762+00') > timeValue('2026-10-20T20:02:59.652Z'));

console.log('pages ok');
