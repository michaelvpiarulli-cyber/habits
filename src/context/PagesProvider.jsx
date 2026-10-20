/**
 * Local-first pages and blocks. Same household id as the rest of Tally.
 * System pages stay virtual until they are edited, starred, or gain a subpage.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  blankBlock,
  blankPage,
  blockFromRow,
  blockToRow,
  descendantIds,
  livingBlocks,
  materialSystem,
  moveBlock,
  pageFromRow,
  pageToRow,
  reorderBlocks,
  sortPagesForWrite,
  systemPageById,
  withSystemPages,
} from '../lib/pages';
import { supabase } from '../lib/supabase';
import { nowISO } from '../lib/mappers';

const KEY = 'tally-notebook';
const MISSING = new Set(['PGRST205', 'PGRST106', '42P01']);

const PagesContext = createContext(null);

function load(scope) {
  try {
    const parsed = JSON.parse(localStorage.getItem(`${KEY}:${scope}`) || '{}');
    return {
      pages: Array.isArray(parsed.pages) ? parsed.pages : [],
      blocks: Array.isArray(parsed.blocks) ? parsed.blocks : [],
    };
  } catch {
    return { pages: [], blocks: [] };
  }
}

function mergeById(remote, local) {
  const map = new Map();
  for (const row of [...remote, ...local]) {
    if (!row?.id) continue;
    const prev = map.get(row.id);
    if (!prev || new Date(row.updatedAt || 0) >= new Date(prev.updatedAt || 0)) map.set(row.id, row);
  }
  return [...map.values()];
}

export function PagesProvider({ children }) {
  const { user, available } = useAuth();
  const scope = user?.id || 'local';
  const [notebook, setNotebook] = useState(() => load(scope));
  const [warning, setWarning] = useState('');
  const dirtyPages = useRef(new Map());
  const dirtyBlocks = useRef(new Map());
  const latest = useRef(notebook);
  latest.current = notebook;
  const timer = useRef(null);
  const scopeRef = useRef(scope);
  scopeRef.current = scope;

  useEffect(() => {
    const next = load(scope);
    setNotebook(next);
    dirtyPages.current = new Map();
    dirtyBlocks.current = new Map();
  }, [scope]);

  useEffect(() => {
    localStorage.setItem(`${KEY}:${scope}`, JSON.stringify(notebook));
  }, [notebook, scope]);

  const markPage = (id) => dirtyPages.current.set(id, (dirtyPages.current.get(id) || 0) + 1);
  const markBlock = (id) => dirtyBlocks.current.set(id, (dirtyBlocks.current.get(id) || 0) + 1);

  const pull = useCallback(async () => {
    if (!available || !user || !supabase) return;
    const [pagesRes, blocksRes] = await Promise.all([
      supabase.from('pages').select('*').eq('user_id', user.id),
      supabase.from('blocks').select('*').eq('user_id', user.id),
    ]);
    if (scopeRef.current !== user.id) return;
    const missing = [pagesRes.error, blocksRes.error].find((error) => error && MISSING.has(error.code));
    if (missing) {
      setWarning('Run supabase/add-pages.sql once so pages sync across devices. They are saved on this device for now.');
      return;
    }
    const failed = pagesRes.error || blocksRes.error;
    if (failed) {
      setWarning(failed.message || 'Could not load pages.');
      return;
    }
    setWarning('');
    setNotebook((prev) => ({
      pages: mergeById((pagesRes.data || []).map(pageFromRow), prev.pages),
      blocks: mergeById((blocksRes.data || []).map(blockFromRow), prev.blocks),
    }));
  }, [available, user]);

  useEffect(() => {
    pull();
    const refresh = () => document.visibilityState === 'visible' && pull();
    document.addEventListener('visibilitychange', refresh);
    const interval = window.setInterval(pull, 60000);
    return () => {
      document.removeEventListener('visibilitychange', refresh);
      window.clearInterval(interval);
    };
  }, [pull]);

  useEffect(() => {
    if (!available || !user || !supabase) return undefined;
    const pendingPages = new Map(dirtyPages.current);
    const pendingBlocks = new Map(dirtyBlocks.current);
    if (pendingPages.size === 0 && pendingBlocks.size === 0) return undefined;

    timer.current = window.setTimeout(async () => {
      const snapshot = latest.current;
      const pageRows = sortPagesForWrite(
        snapshot.pages.filter((page) => pendingPages.has(page.id)).map((page) => pageToRow(page, user.id))
      );
      if (pageRows.length) {
        const { error } = await supabase.from('pages').upsert(pageRows);
        if (!error) {
          for (const [id, revision] of pendingPages) {
            if (dirtyPages.current.get(id) === revision) dirtyPages.current.delete(id);
          }
        } else if (MISSING.has(error.code)) {
          setWarning('Run supabase/add-pages.sql once so pages sync across devices. They are saved on this device for now.');
        }
      }
      const blockRows = snapshot.blocks
        .filter((block) => pendingBlocks.has(block.id))
        .map((block) => blockToRow(block, user.id));
      if (blockRows.length) {
        const { error } = await supabase.from('blocks').upsert(blockRows);
        if (!error) {
          for (const [id, revision] of pendingBlocks) {
            if (dirtyBlocks.current.get(id) === revision) dirtyBlocks.current.delete(id);
          }
        }
      }
    }, 700);

    return () => window.clearTimeout(timer.current);
  }, [available, user, notebook]);

  const materialize = useCallback((list, id) => {
    if (!id || list.some((page) => page.id === id)) return list;
    const seed = systemPageById(id);
    if (!seed) return list;
    const page = materialSystem(seed);
    markPage(page.id);
    return [...list, page];
  }, []);

  const updatePage = useCallback((id, patch) => {
    setNotebook((prev) => {
      let pages = materialize(prev.pages, id);
      const current = withSystemPages(pages).find((page) => page.id === id);
      if (!current) return prev;
      const next = { ...current, ...patch, updatedAt: nowISO() };
      pages = pages.some((page) => page.id === id)
        ? pages.map((page) => (page.id === id ? next : page))
        : [...pages, next];
      markPage(id);
      return { ...prev, pages };
    });
  }, [materialize]);

  const createPage = useCallback((parentId = null) => {
    let created = null;
    setNotebook((prev) => {
      let pages = materialize(prev.pages, parentId);
      const siblings = pages.filter((page) => !page.deleted && page.parentId === parentId);
      created = blankPage({
        parentId,
        position: siblings.reduce((max, page) => Math.max(max, page.position), 99) + 1,
      });
      const block = blankBlock({ pageId: created.id });
      markPage(created.id);
      markBlock(block.id);
      return { pages: [...pages, created], blocks: [...prev.blocks, block] };
    });
    return created;
  }, [materialize]);

  const deletePage = useCallback((id) => {
    if (systemPageById(id)) return;
    setNotebook((prev) => {
      const ids = new Set([id, ...descendantIds(prev.pages, id)]);
      const now = nowISO();
      const pages = prev.pages.map((page) => {
        if (!ids.has(page.id)) return page;
        markPage(page.id);
        return { ...page, deleted: true, updatedAt: now };
      });
      const blocks = prev.blocks.map((block) => {
        if (!ids.has(block.pageId)) return block;
        markBlock(block.id);
        return { ...block, deleted: true, updatedAt: now };
      });
      return { pages, blocks };
    });
  }, []);

  const addBlock = useCallback((pageId, { type = 'text', position, content = '' } = {}) => {
    const existing = livingBlocks(latest.current.blocks, pageId);
    const index = position == null ? existing.length : position;
    const created = blankBlock({ pageId, type, position: index, content });
    setNotebook((prev) => {
      const pages = materialize(prev.pages, pageId);
      const blocks = prev.blocks.map((block) => {
        if (block.pageId !== pageId || block.deleted || block.position < index) return block;
        markBlock(block.id);
        return { ...block, position: block.position + 1, updatedAt: nowISO() };
      });
      markBlock(created.id);
      return { pages, blocks: [...blocks, created] };
    });
    return created;
  }, [materialize]);

  const updateBlock = useCallback((id, patch) => {
    setNotebook((prev) => ({
      ...prev,
      blocks: prev.blocks.map((block) => {
        if (block.id !== id) return block;
        markBlock(id);
        return { ...block, ...patch, updatedAt: nowISO() };
      }),
    }));
  }, []);

  const deleteBlock = useCallback((id) => {
    updateBlock(id, { deleted: true });
  }, [updateBlock]);

  const reorder = useCallback((pageId, activeId, overId) => {
    setNotebook((prev) => {
      const result = reorderBlocks(prev.blocks, pageId, activeId, overId);
      result.moved.forEach(markBlock);
      return { ...prev, blocks: result.blocks };
    });
  }, []);

  const move = useCallback((pageId, id, delta) => {
    setNotebook((prev) => {
      const result = moveBlock(prev.blocks, pageId, id, delta);
      result.moved.forEach(markBlock);
      return { ...prev, blocks: result.blocks };
    });
  }, []);

  const value = useMemo(
    () => ({
      pages: notebook.pages,
      blocks: notebook.blocks,
      warning,
      updatePage,
      createPage,
      deletePage,
      addBlock,
      updateBlock,
      deleteBlock,
      reorder,
      move,
    }),
    [notebook, warning, updatePage, createPage, deletePage, addBlock, updateBlock, deleteBlock, reorder, move]
  );

  return <PagesContext.Provider value={value}>{children}</PagesContext.Provider>;
}

export function usePages() {
  const value = useContext(PagesContext);
  if (!value) throw new Error('usePages must be used inside PagesProvider');
  return value;
}
