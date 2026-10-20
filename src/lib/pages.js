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
  { type: 'h1', label: 'Heading 1', hint: 'Large heading' },
  { type: 'h2', label: 'Heading 2', hint: 'Medium heading' },
  { type: 'h3', label: 'Heading 3', hint: 'Small heading' },
  { type: 'todo', label: 'To-do', hint: 'Checkbox' },
  { type: 'bullet', label: 'Bullet', hint: 'Simple list' },
  { type: 'toggle', label: 'Toggle', hint: 'Hide extra text' },
  { type: 'callout', label: 'Callout', hint: 'Highlighted note' },
  { type: 'divider', label: 'Divider', hint: 'A horizontal line' },
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
  if (text.includes('\n') || text.length > 24) return null;
  return text.slice(1);
}

export function blankPage({ parentId = null, position = 100 } = {}) {
  const now = nowISO();
  return {
    id: newId(),
    parentId,
    title: 'Untitled',
    icon: '📄',
    cover: '',
    favorite: false,
    systemKey: null,
    position,
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
    props: type === 'callout' ? { icon: '💡' } : {},
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
