/**
 * Notebook pages and blocks. System pages (Today, Plan, …) always appear.
 * They are written to Supabase the first time they are edited or gain a subpage.
 */

import { newId, nowISO } from './mappers.js';

export const SYSTEM_PAGES = [
  { id: 'b1111111-1111-4111-8111-111111111101', systemKey: 'today', title: 'Today', icon: '☀️', position: 0 },
  { id: 'b1111111-1111-4111-8111-111111111102', systemKey: 'plan', title: 'Plan', icon: '📅', position: 1 },
  { id: 'b1111111-1111-4111-8111-111111111103', systemKey: 'body', title: 'Body', icon: '💪', position: 2 },
  { id: 'b1111111-1111-4111-8111-111111111104', systemKey: 'word', title: 'Word', icon: '📖', position: 3 },
  { id: 'b1111111-1111-4111-8111-111111111105', systemKey: 'jeno', title: 'JENO', icon: '✦', position: 4 },
  { id: 'b1111111-1111-4111-8111-111111111106', systemKey: 'log', title: 'Log', icon: '✎', position: 5 },
  { id: 'b1111111-1111-4111-8111-111111111107', systemKey: 'settings', title: 'Settings', icon: '⚙', position: 6 },
];

export const BLOCK_MENU = [
  { type: 'text', label: 'Text', hint: 'Plain paragraph' },
  { type: 'h1', label: 'Heading 1', hint: 'Type # ' },
  { type: 'h2', label: 'Heading 2', hint: 'Type ## ' },
  { type: 'h3', label: 'Heading 3', hint: 'Type ### ' },
  { type: 'todo', label: 'To-do', hint: 'Type [] ' },
  { type: 'bullet', label: 'Bulleted list', hint: 'Type - ' },
  { type: 'numbered', label: 'Numbered list', hint: 'Type 1. ' },
  { type: 'toggle', label: 'Toggle', hint: 'Hide extra text' },
  { type: 'quote', label: 'Quote', hint: 'Type > ' },
  { type: 'callout', label: 'Callout', hint: 'Highlighted note' },
  { type: 'code', label: 'Code', hint: 'Monospace block' },
  { type: 'divider', label: 'Divider', hint: 'Type ---' },
  { type: 'image', label: 'Image', hint: 'Picture from a link' },
  { type: 'bookmark', label: 'Bookmark', hint: 'Link preview' },
  { type: 'embed', label: 'Embed', hint: 'A page on the web' },
  { type: 'table', label: 'Table', hint: 'Simple rows' },
  { type: 'columns', label: 'Columns', hint: 'Two columns' },
  { type: 'page', label: 'Link to page', hint: 'A page in Tally' },
  { type: 'synced', label: 'Synced block', hint: 'Mirror another page' },
  { type: 'database', label: 'Database', hint: 'Tasks, goals, workouts' },
];

export const BLOCK_COLORS = ['default', 'gray', 'brown', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'red'];

export const DATABASE_SOURCES = [
  ['tasks', 'Tasks'],
  ['goals', 'Goals'],
  ['watches', 'Watch log'],
  ['workouts', 'Workouts'],
];

const MARKDOWN = [
  [/^### $/, 'h3'],
  [/^## $/, 'h2'],
  [/^# $/, 'h1'],
  [/^(?:\[\]|\[ \]) $/, 'todo'],
  [/^(?:-|\*) $/, 'bullet'],
  [/^1\. $/, 'numbered'],
  [/^> $/, 'quote'],
  [/^```$/, 'code'],
  [/^---$/, 'divider'],
];

export const COVERS = {
  ink: 'linear-gradient(135deg, #2f2f2f, #6b6b6b)',
  sage: 'linear-gradient(135deg, #d5e6dc, #8fbfa8)',
  sand: 'linear-gradient(135deg, #f4ecdc, #e2c48a)',
  dusk: 'linear-gradient(135deg, #e0daf2, #8f88b8)',
  rose: 'linear-gradient(135deg, #f8ddd6, #e3a394)',
  sea: 'linear-gradient(135deg, #d7e7f6, #7eadd4)',
};

const SYSTEM_BY_ID = new Map(SYSTEM_PAGES.map((page) => [page.id, page]));
const SYSTEM_BY_KEY = new Map(SYSTEM_PAGES.map((page) => [page.systemKey, page]));

export function systemPageById(id) {
  return SYSTEM_BY_ID.get(id) || null;
}

export function systemPageByKey(key) {
  return SYSTEM_BY_KEY.get(key) || null;
}

export function livingPages(pages) {
  return (pages || []).filter((page) => page && !page.deleted);
}

export function materialSystem(seed) {
  const now = nowISO();
  return {
    id: seed.id,
    parentId: null,
    title: seed.title,
    icon: seed.icon,
    cover: '',
    favorite: false,
    systemKey: seed.systemKey,
    position: seed.position,
    deleted: false,
    createdAt: now,
    updatedAt: now,
  };
}

/** Stored pages plus any system page that has not been saved yet. */
export function withSystemPages(pages) {
  const stored = livingPages(pages);
  const have = new Set(stored.filter((page) => page.systemKey).map((page) => page.systemKey));
  const virtual = SYSTEM_PAGES.filter((seed) => !have.has(seed.systemKey)).map(materialSystem);
  return [...stored, ...virtual];
}

export function pageById(pages, id) {
  return withSystemPages(pages).find((page) => page.id === id) || null;
}

export function childrenOf(pages, parentId) {
  return withSystemPages(pages)
    .filter((page) => (parentId ? page.parentId === parentId : !page.parentId))
    .sort((a, b) => (a.position - b.position) || a.title.localeCompare(b.title));
}

export function favoritePages(pages) {
  return withSystemPages(pages)
    .filter((page) => page.favorite)
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function breadcrumbs(pages, id) {
  const all = withSystemPages(pages);
  const trail = [];
  const seen = new Set();
  let current = all.find((page) => page.id === id) || null;
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    trail.unshift(current);
    current = current.parentId ? all.find((page) => page.id === current.parentId) || null : null;
  }
  return trail;
}

export function descendantIds(pages, id) {
  const ids = [];
  const walk = (parentId) => {
    for (const page of livingPages(pages)) {
      if (page.parentId !== parentId) continue;
      ids.push(page.id);
      walk(page.id);
    }
  };
  walk(id);
  return ids;
}

export function searchPages(pages, blocks, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];
  const hits = new Set(
    (blocks || [])
      .filter((block) => block && !block.deleted && String(block.content || '').toLowerCase().includes(q))
      .map((block) => block.pageId)
  );
  return withSystemPages(pages).filter(
    (page) => page.title.toLowerCase().includes(q) || hits.has(page.id)
  );
}

export function filterCommands(query) {
  const q = String(query || '').replace(/^\//, '').trim().toLowerCase();
  if (!q) return BLOCK_MENU;
  return BLOCK_MENU.filter(
    (item) =>
      item.type.includes(q) ||
      item.label.toLowerCase().includes(q) ||
      item.hint.toLowerCase().includes(q)
  );
}

export function slashQuery(content) {
  const text = String(content || '');
  if (!text.startsWith('/')) return null;
  if (text.includes('\n') || text.length > 32) return null;
  return text.slice(1);
}

/** Turn a finished markdown prefix into a block type. Null when it is still just text. */
export function markdownShortcut(content) {
  const text = String(content ?? '');
  for (const [pattern, type] of MARKDOWN) {
    if (pattern.test(text)) return { type, content: type === 'divider' ? '' : '' };
  }
  return null;
}

export function mentionQuery(content) {
  const match = String(content || '').match(/(?:^|\s)@([^@\n]{0,32})$/);
  return match ? match[1] : null;
}

export function applyMention(content, label) {
  return String(content || '').replace(/(?:^|\s)@([^@\n]{0,32})$/, (full) => {
    const lead = full.startsWith(' ') || full.startsWith('\n') ? full[0] : '';
    return `${lead}[[${label}]] `;
  });
}

export function splitContent(content, offset) {
  const text = String(content || '');
  const at = Math.max(0, Math.min(text.length, Number.isFinite(offset) ? offset : text.length));
  return { before: text.slice(0, at), after: text.slice(at) };
}

export function mergeContent(previous, current) {
  return `${previous || ''}${current || ''}`;
}

export function editedLabel(iso, now = Date.now()) {
  if (!iso) return 'Edited just now';
  const delta = Math.max(0, now - new Date(iso).getTime());
  const min = Math.round(delta / 60000);
  if (min < 1) return 'Edited just now';
  if (min < 60) return `Edited ${min}m ago`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `Edited ${hours}h ago`;
  const days = Math.round(hours / 24);
  return `Edited ${days}d ago`;
}

export function templateSpec(key, today = new Date()) {
  const day = today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  if (key === 'weekly') {
    return {
      title: 'Weekly review',
      icon: '🗓️',
      blocks: [
        { type: 'h2', content: 'What moved' },
        { type: 'bullet', content: '' },
        { type: 'h2', content: 'What to carry' },
        { type: 'todo', content: '' },
        { type: 'quote', content: 'One thing to protect next week' },
      ],
    };
  }
  return {
    title: day,
    icon: '☀️',
    blocks: [
      { type: 'todo', content: '' },
      { type: 'todo', content: '' },
      { type: 'h3', content: 'Notes' },
      { type: 'text', content: '' },
    ],
  };
}

export function trashedPages(pages) {
  return (pages || [])
    .filter((page) => page && page.deleted && !page.systemKey)
    .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
}

export function pushHistory(page, blocks, limit = 12) {
  const shot = {
    at: nowISO(),
    title: page?.title || '',
    blocks: livingBlocks(blocks, page?.id).slice(0, 40).map((block) => ({
      type: block.type,
      content: block.content,
      checked: !!block.checked,
    })),
  };
  const prior = Array.isArray(page?.props?.history) ? page.props.history : [];
  const last = prior[0];
  if (last && last.title === shot.title && JSON.stringify(last.blocks) === JSON.stringify(shot.blocks)) {
    return page?.props || {};
  }
  return { ...(page?.props || {}), history: [shot, ...prior].slice(0, limit) };
}

export function defaultProps(type) {
  if (type === 'callout') return { icon: '💡' };
  if (type === 'table') return { rows: [['', ''], ['', '']] };
  if (type === 'columns') return { left: '', right: '' };
  if (type === 'database') return { source: 'tasks' };
  if (type === 'image' || type === 'bookmark' || type === 'embed') return { url: '' };
  return {};
}

export function blankPage({ parentId = null, position = 100 } = {}) {
  const now = nowISO();
  return {
    id: newId(),
    parentId,
    title: 'Untitled',
    icon: '',
    cover: '',
    favorite: false,
    systemKey: null,
    position,
    props: {},
    deleted: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function blankBlock({ pageId, type = 'text', position = 0, content = '' } = {}) {
  const now = nowISO();
  return {
    id: newId(),
    pageId,
    type,
    content,
    checked: false,
    props: defaultProps(type),
    position,
    deleted: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function livingBlocks(blocks, pageId) {
  return (blocks || [])
    .filter((block) => block && !block.deleted && (!pageId || block.pageId === pageId))
    .sort((a, b) => a.position - b.position || String(a.createdAt).localeCompare(String(b.createdAt)));
}

export function reorderBlocks(blocks, pageId, activeId, overId) {
  const pageBlocks = livingBlocks(blocks, pageId);
  const from = pageBlocks.findIndex((block) => block.id === activeId);
  const to = pageBlocks.findIndex((block) => block.id === overId);
  if (from < 0 || to < 0 || from === to) return { blocks, moved: [] };
  const next = pageBlocks.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  const positions = new Map(next.map((block, index) => [block.id, index]));
  const now = nowISO();
  return {
    moved: [...positions.keys()],
    blocks: blocks.map((block) =>
      positions.has(block.id) ? { ...block, position: positions.get(block.id), updatedAt: now } : block
    ),
  };
}

export function moveBlock(blocks, pageId, id, delta) {
  const pageBlocks = livingBlocks(blocks, pageId);
  const index = pageBlocks.findIndex((block) => block.id === id);
  const target = pageBlocks[index + delta];
  if (!target) return { blocks, moved: [] };
  return reorderBlocks(blocks, pageId, id, target.id);
}

export function pageFromRow(row) {
  return {
    id: row.id,
    parentId: row.parent_id || null,
    title: row.title || 'Untitled',
    icon: row.icon || '',
    cover: row.cover || '',
    favorite: !!row.favorite,
    systemKey: row.system_key || null,
    position: row.position ?? 0,
    props: row.props && typeof row.props === 'object' ? row.props : {},
    deleted: !!row.deleted,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function pageToRow(page, userId) {
  return {
    id: page.id,
    user_id: userId,
    parent_id: page.parentId || null,
    title: page.title || 'Untitled',
    icon: page.icon || '',
    cover: page.cover || '',
    favorite: !!page.favorite,
    system_key: page.systemKey || null,
    position: page.position ?? 0,
    props: page.props || {},
    deleted: !!page.deleted,
    created_at: page.createdAt,
    updated_at: page.updatedAt,
  };
}

export function blockFromRow(row) {
  return {
    id: row.id,
    pageId: row.page_id,
    type: row.type || 'text',
    content: row.content || '',
    checked: !!row.checked,
    props: row.props && typeof row.props === 'object' ? row.props : {},
    position: row.position ?? 0,
    deleted: !!row.deleted,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function blockToRow(block, userId) {
  return {
    id: block.id,
    user_id: userId,
    page_id: block.pageId,
    type: block.type || 'text',
    content: block.content || '',
    checked: !!block.checked,
    props: block.props || {},
    position: block.position ?? 0,
    deleted: !!block.deleted,
    created_at: block.createdAt,
    updated_at: block.updatedAt,
  };
}

/** Parents before children so a single upsert batch satisfies the foreign key. */
export function sortPagesForWrite(rows) {
  const pending = rows.slice();
  const ordered = [];
  const seen = new Set();
  const ids = new Set(rows.map((row) => row.id));
  let guard = 0;
  while (pending.length && guard < rows.length + 2) {
    guard += 1;
    let moved = false;
    for (let index = pending.length - 1; index >= 0; index -= 1) {
      const row = pending[index];
      if (!row.parent_id || seen.has(row.parent_id) || !ids.has(row.parent_id)) {
        ordered.push(row);
        seen.add(row.id);
        pending.splice(index, 1);
        moved = true;
      }
    }
    if (!moved) break;
  }
  return ordered.concat(pending);
}
