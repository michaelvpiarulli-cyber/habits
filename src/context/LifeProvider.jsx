/**
 * Life-dashboard collections: tasks, calendar events, books, jobs, money.
 *
 * Same local-first contract as DataProvider — localStorage is the source of
 * truth, Supabase is a merge on sign-in and a debounced push of dirty rows.
 * Kept in its own provider so habit/workout sync stays untouched.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { newId, nowISO } from '../lib/mappers';
import { todayISO } from '../lib/dates';
import {
  accountFromRow,
  accountToRow,
  bookFromRow,
  bookToRow,
  budgetFromRow,
  budgetToRow,
  entryFromRow,
  entryToRow,
  eventFromRow,
  eventToRow,
  jobFromRow,
  jobToRow,
  taskFromRow,
  taskToRow,
} from '../lib/lifeMappers';
import { clampPage, living, roundMoney } from '../lib/life';

const KINDS = ['tasks', 'events', 'books', 'jobs', 'accounts', 'entries', 'budgets'];

const TABLES = {
  tasks: { table: 'tasks', from: taskFromRow, to: taskToRow },
  events: { table: 'calendar_events', from: eventFromRow, to: eventToRow },
  books: { table: 'books', from: bookFromRow, to: bookToRow },
  jobs: { table: 'job_apps', from: jobFromRow, to: jobToRow },
  accounts: { table: 'finance_accounts', from: accountFromRow, to: accountToRow },
  entries: { table: 'finance_entries', from: entryFromRow, to: entryToRow },
  budgets: { table: 'finance_budgets', from: budgetFromRow, to: budgetToRow },
};

const KEY = (kind) => `tally-${kind}`;
const ANONYMOUS_SCOPE = 'anonymous';
const TOMBSTONE_TTL_DAYS = 90;
const PUSH_DEBOUNCE_MS = 700;
const scopedKey = (kind, scope) => `${KEY(kind)}:${scope}`;
const anonymousClaimedKey = (userId) => `tally-life-anonymous-claimed:${userId}`;

const MISSING_TABLE_CODES = new Set(['PGRST205', 'PGRST106', '42P01']);
const isMissingTable = (error) => MISSING_TABLE_CODES.has(error?.code);
const isRlsViolation = (error) =>
  error?.code === '42501' || /row-level security/i.test(error?.message || '');
const isUniqueViolation = (error) =>
  error?.code === '23505' || /duplicate key/i.test(error?.message || '');
const missingTableMessage = (table) =>
  `${table}: missing in Supabase — run supabase/add-life-dashboard.sql in the SQL editor, then Sync now`;

function emptyStore() {
  return Object.fromEntries(KINDS.map((kind) => [kind, []]));
}

function emptyDirty() {
  return Object.fromEntries(KINDS.map((kind) => [kind, new Map()]));
}

function loadList(key) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function purgeStale(list) {
  const cutoff = Date.now() - TOMBSTONE_TTL_DAYS * 86400000;
  return list.filter((r) => !r.deleted || new Date(r.updatedAt).getTime() > cutoff);
}

function loadScopedStore(scope) {
  return Object.fromEntries(
    KINDS.map((kind) => [kind, purgeStale(loadList(scopedKey(kind, scope)))])
  );
}

function mergeById(remote, local) {
  const map = new Map();
  for (const rec of [...remote, ...local]) {
    if (!rec?.id) continue;
    const prev = map.get(rec.id);
    if (!prev || new Date(rec.updatedAt || 0) >= new Date(prev.updatedAt || 0)) {
      map.set(rec.id, rec);
    }
  }
  return [...map.values()];
}

function claimAnonymous(userId) {
  if (localStorage.getItem(anonymousClaimedKey(userId))) return null;
  const anonymous = loadScopedStore(ANONYMOUS_SCOPE);
  const hasData = KINDS.some((kind) => anonymous[kind].length > 0);
  localStorage.setItem(anonymousClaimedKey(userId), hasData ? 'claimed' : 'empty');
  return hasData ? anonymous : null;
}

const LifeContext = createContext(null);

export function LifeProvider({ children }) {
  const { available, loading: authLoading, user } = useAuth();
  const [store, setStore] = useState(emptyStore);
  const [storageScope, setStorageScope] = useState(null);
  const [syncState, setSyncState] = useState('idle');
  const [syncError, setSyncError] = useState('');
  const [retryTick, setRetryTick] = useState(0);

  const hydratedFor = useRef(null);
  const pushTimer = useRef(null);
  const pulling = useRef(null);
  const syncGeneration = useRef(0);
  const dirty = useRef(emptyDirty());
  const latest = useRef(store);
  latest.current = store;
  const currentUserId = useRef(user?.id);
  currentUserId.current = user?.id;
  const desiredScope = authLoading ? null : user?.id || ANONYMOUS_SCOPE;

  const markDirty = useCallback((kind, id) => {
    dirty.current[kind].set(id, (dirty.current[kind].get(id) || 0) + 1);
  }, []);

  useEffect(() => {
    if (storageScope === desiredScope) return;
    syncGeneration.current += 1;
    clearTimeout(pushTimer.current);
    pulling.current = null;
    hydratedFor.current = null;
    dirty.current = emptyDirty();

    if (!desiredScope) {
      setStorageScope(null);
      setSyncState('idle');
      return;
    }

    let next = loadScopedStore(desiredScope);
    if (user) {
      const fromAnonymous = claimAnonymous(user.id);
      if (fromAnonymous) {
        next = Object.fromEntries(
          KINDS.map((kind) => [kind, mergeById(next[kind], fromAnonymous[kind])])
        );
      }
    }
    setStore(next);
    setStorageScope(desiredScope);
    setSyncState(user ? 'syncing' : 'idle');
  }, [desiredScope, storageScope, user]);

  useEffect(() => {
    if (!user || storageScope !== user.id) return;
    const fromAnonymous = claimAnonymous(user.id);
    if (!fromAnonymous) return;
    setStore((prev) =>
      Object.fromEntries(KINDS.map((kind) => [kind, mergeById(prev[kind], fromAnonymous[kind])]))
    );
    KINDS.forEach((kind) => fromAnonymous[kind].forEach((row) => markDirty(kind, row.id)));
  }, [user, storageScope, markDirty]);

  useEffect(() => {
    if (!storageScope) return;
    for (const kind of KINDS) {
      localStorage.setItem(scopedKey(kind, storageScope), JSON.stringify(store[kind]));
    }
  }, [store, storageScope]);

  const pullRemote = useCallback(
    async ({ initial = false } = {}) => {
      if (!available || !user || storageScope !== user.id) return;
      const generation = syncGeneration.current;
      if (pulling.current === generation) return;
      pulling.current = generation;
      setSyncState('syncing');
      setSyncError('');

      let results;
      try {
        results = await Promise.all(
          KINDS.map((kind) =>
            supabase.from(TABLES[kind].table).select('*').eq('user_id', user.id)
          )
        );
      } catch {
        if (pulling.current === generation) pulling.current = null;
        if (syncGeneration.current === generation) {
          setSyncError('Could not reach the sync server.');
          setSyncState('error');
        }
        return;
      }

      if (
        syncGeneration.current !== generation ||
        currentUserId.current !== user.id ||
        storageScope !== user.id
      ) {
        if (pulling.current === generation) pulling.current = null;
        return;
      }

      const failed = results.find((result) => result.error && !isMissingTable(result.error));
      if (failed) {
        if (pulling.current === generation) pulling.current = null;
        setSyncError(failed.error.message || failed.error.code || 'Cloud download failed.');
        setSyncState('error');
        return;
      }

      const local = latest.current;
      const merged = {};
      KINDS.forEach((kind, index) => {
        const result = results[index];
        merged[kind] =
          result.error && isMissingTable(result.error)
            ? local[kind]
            : mergeById((result.data || []).map(TABLES[kind].from), local[kind]);
      });

      setStore(merged);
      if (initial) {
        KINDS.forEach((kind) => merged[kind].forEach((row) => markDirty(kind, row.id)));
      }
      hydratedFor.current = user.id;
      if (pulling.current === generation) pulling.current = null;
      const anyDirty = Object.values(dirty.current).some((ids) => ids.size > 0);
      setSyncState(anyDirty ? 'syncing' : 'synced');
    },
    [available, user, storageScope, markDirty]
  );

  useEffect(() => {
    if (!available || !user) {
      hydratedFor.current = null;
      setSyncState('idle');
      return;
    }
    if (storageScope !== user.id) return;
    if (hydratedFor.current !== user.id) pullRemote({ initial: true });
  }, [available, user, storageScope, pullRemote]);

  useEffect(() => {
    if (!available || !user || storageScope !== user.id) return undefined;
    const refresh = () => {
      if (hydratedFor.current !== user.id) return;
      pullRemote();
      setRetryTick((tick) => tick + 1);
    };
    const onVisible = () => document.visibilityState === 'visible' && refresh();
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', onVisible);
    const interval = window.setInterval(refresh, 60000);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(interval);
    };
  }, [available, user, storageScope, pullRemote]);

  useEffect(() => {
    if (!available || !user || storageScope !== user.id || hydratedFor.current !== user.id) {
      return;
    }
    const pending = store;
    const anyDirty = Object.values(dirty.current).some((s) => s.size > 0);
    if (!anyDirty) return;

    setSyncState('syncing');
    setSyncError('');
    clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(async () => {
      const generation = syncGeneration.current;
      let failed = false;
      let firstError = '';
      const stillCurrent = () =>
        syncGeneration.current === generation && currentUserId.current === user.id;

      const clearDirty = (kind, revisions) => {
        for (const [id, revision] of revisions) {
          if (dirty.current[kind].get(id) === revision) dirty.current[kind].delete(id);
        }
      };

      for (const kind of KINDS) {
        if (!stillCurrent()) return;
        const { table, to } = TABLES[kind];
        const revisions = new Map(dirty.current[kind]);
        if (revisions.size === 0) continue;
        const records = pending[kind].filter((r) => revisions.has(r.id));
        const rows = records.map((r) => to(r, user.id));
        if (rows.length === 0) {
          clearDirty(kind, revisions);
          continue;
        }

        let error;
        try {
          ({ error } = await supabase.from(table).upsert(rows));
        } catch {
          error = { message: 'write failed' };
        }
        if (!stillCurrent()) return;

        if (error && isMissingTable(error)) {
          failed = true;
          if (!firstError) firstError = missingTableMessage(table);
          continue;
        }

        if (error && (isRlsViolation(error) || isUniqueViolation(error))) {
          let rowFailed = false;
          for (const row of rows) {
            if (!stillCurrent()) return;
            let attempt = row;
            let result = await supabase.from(table).upsert(attempt);
            if (result.error && (isRlsViolation(result.error) || isUniqueViolation(result.error))) {
              attempt = { ...attempt, id: newId() };
              result = await supabase.from(table).upsert(attempt);
              if (!result.error && attempt.id !== row.id) {
                setStore((prev) => ({
                  ...prev,
                  [kind]: prev[kind].map((item) =>
                    item.id === row.id ? { ...item, id: attempt.id } : item
                  ),
                }));
              }
            }
            if (result.error) {
              rowFailed = true;
              if (!firstError) {
                firstError = isMissingTable(result.error)
                  ? missingTableMessage(table)
                  : `${table}: ${result.error.message || result.error.code || 'write failed'}`;
              }
            }
          }
          if (rowFailed) {
            failed = true;
            continue;
          }
          clearDirty(kind, revisions);
          continue;
        }

        if (error) {
          failed = true;
          if (!firstError) firstError = `${table}: ${error.message || error.code || 'write failed'}`;
          continue;
        }
        clearDirty(kind, revisions);
      }

      if (!stillCurrent()) return;
      const stillDirty = Object.values(dirty.current).some((records) => records.size > 0);
      setSyncError(firstError);
      setSyncState(failed ? 'error' : stillDirty ? 'syncing' : 'synced');
    }, PUSH_DEBOUNCE_MS);

    return () => clearTimeout(pushTimer.current);
  }, [store, available, user, storageScope, retryTick]);

  const syncNow = useCallback(() => {
    setRetryTick((tick) => tick + 1);
    if (available && user && storageScope === user.id) pullRemote();
  }, [available, user, storageScope, pullRemote]);

  const updateRecord = useCallback(
    (kind, id, patch) => {
      setStore((prev) => ({
        ...prev,
        [kind]: prev[kind].map((row) =>
          row.id === id ? { ...row, ...patch, updatedAt: nowISO() } : row
        ),
      }));
      markDirty(kind, id);
    },
    [markDirty]
  );

  const addRecord = useCallback(
    (kind, fields) => {
      const row = {
        id: newId(),
        deleted: false,
        createdAt: nowISO(),
        updatedAt: nowISO(),
        ...fields,
      };
      setStore((prev) => ({ ...prev, [kind]: [...prev[kind], row] }));
      markDirty(kind, row.id);
      return row;
    },
    [markDirty]
  );

  const deleteRecord = useCallback(
    (kind, id) => updateRecord(kind, id, { deleted: true }),
    [updateRecord]
  );

  const addTask = useCallback(
    (fields) =>
      addRecord('tasks', {
        title: fields.title.trim(),
        notes: fields.notes || '',
        dueDate: fields.dueDate || null,
        dueTime: fields.dueTime || '',
        list: fields.list || 'inbox',
        priority: fields.priority || 'none',
        done: false,
        completedAt: null,
        googleEventId: fields.googleEventId || '',
      }),
    [addRecord]
  );

  const updateTask = useCallback(
    (id, patch) => updateRecord('tasks', id, patch),
    [updateRecord]
  );

  const toggleTask = useCallback(
    (id) => {
      const task = latest.current.tasks.find((row) => row.id === id);
      if (!task) return;
      updateRecord('tasks', id, {
        done: !task.done,
        completedAt: task.done ? null : nowISO(),
      });
    },
    [updateRecord]
  );

  const addEvent = useCallback(
    (fields) =>
      addRecord('events', {
        title: fields.title.trim(),
        notes: fields.notes || '',
        day: fields.day || todayISO(),
        startTime: fields.allDay || !fields.startTime ? '' : fields.startTime || '',
        endTime: fields.allDay || !fields.startTime ? '' : fields.endTime || '',
        allDay: Boolean(fields.allDay) || !fields.startTime,
        location: fields.location || '',
        googleEventId: fields.googleEventId || '',
      }),
    [addRecord]
  );

  const addBook = useCallback(
    (fields) =>
      addRecord('books', {
        title: fields.title.trim(),
        author: fields.author || '',
        totalPages: Math.max(0, Number(fields.totalPages) || 0),
        currentPage: Math.max(0, Number(fields.currentPage) || 0),
        status: fields.status || 'queued',
        startedOn: fields.startedOn || (fields.status === 'reading' ? todayISO() : null),
        finishedOn: fields.status === 'done' ? fields.finishedOn || todayISO() : null,
        notes: fields.notes || '',
      }),
    [addRecord]
  );

  const setBookPage = useCallback(
    (id, page) => {
      const book = latest.current.books.find((row) => row.id === id);
      if (!book) return;
      const currentPage = clampPage(book, page);
      const done = book.totalPages > 0 && currentPage >= book.totalPages;
      updateRecord('books', id, {
        currentPage,
        status: done ? 'done' : book.status === 'queued' ? 'reading' : book.status,
        startedOn: book.startedOn || todayISO(),
        finishedOn: done ? book.finishedOn || todayISO() : null,
      });
    },
    [updateRecord]
  );

  const addJob = useCallback(
    (fields) =>
      addRecord('jobs', {
        company: fields.company.trim(),
        role: fields.role.trim(),
        status: fields.status || 'saved',
        url: fields.url || '',
        location: fields.location || '',
        salary: fields.salary || '',
        appliedOn: fields.appliedOn || (fields.status === 'applied' ? todayISO() : null),
        dueDate: fields.dueDate || null,
        notes: fields.notes || '',
        googleEventId: fields.googleEventId || '',
      }),
    [addRecord]
  );

  const addAccount = useCallback(
    (fields) =>
      addRecord('accounts', {
        name: fields.name.trim(),
        kind: fields.kind || 'checking',
        openingBalance: roundMoney(fields.openingBalance),
        currency: fields.currency || 'USD',
      }),
    [addRecord]
  );

  const addEntry = useCallback(
    (fields) =>
      addRecord('entries', {
        accountId: fields.accountId || null,
        day: fields.day || todayISO(),
        amount: roundMoney(fields.amount),
        direction: fields.direction || 'out',
        category: fields.category || 'Other',
        payee: fields.payee || '',
        notes: fields.notes || '',
      }),
    [addRecord]
  );

  const addBudget = useCallback(
    (fields) =>
      addRecord('budgets', {
        category: fields.category.trim(),
        month: fields.month,
        amount: roundMoney(fields.amount),
      }),
    [addRecord]
  );

  const snapshot = useCallback(
    () => ({
      tasks: store.tasks,
      events: store.events,
      books: store.books,
      jobs: store.jobs,
      accounts: store.accounts,
      entries: store.entries,
      budgets: store.budgets,
    }),
    [store]
  );

  const value = useMemo(() => {
    const tasks = living(store.tasks).sort((a, b) =>
      (a.dueDate || '9999').localeCompare(b.dueDate || '9999')
    );
    const events = living(store.events).sort(
      (a, b) => a.day.localeCompare(b.day) || (a.startTime || '').localeCompare(b.startTime || '')
    );
    const books = living(store.books).sort((a, b) => a.title.localeCompare(b.title));
    const jobs = living(store.jobs).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const accounts = living(store.accounts).sort((a, b) => a.name.localeCompare(b.name));
    const entries = living(store.entries).sort((a, b) =>
      b.day.localeCompare(a.day) || b.createdAt.localeCompare(a.createdAt)
    );
    const budgets = living(store.budgets);

    return {
      tasks,
      events,
      books,
      jobs,
      accounts,
      entries,
      budgets,
      addTask,
      updateTask,
      toggleTask,
      deleteTask: (id) => deleteRecord('tasks', id),
      addEvent,
      updateEvent: (id, patch) => updateRecord('events', id, patch),
      deleteEvent: (id) => deleteRecord('events', id),
      addBook,
      updateBook: (id, patch) => updateRecord('books', id, patch),
      setBookPage,
      deleteBook: (id) => deleteRecord('books', id),
      addJob,
      updateJob: (id, patch) => updateRecord('jobs', id, patch),
      deleteJob: (id) => deleteRecord('jobs', id),
      addAccount,
      updateAccount: (id, patch) => updateRecord('accounts', id, patch),
      deleteAccount: (id) => deleteRecord('accounts', id),
      addEntry,
      updateEntry: (id, patch) => updateRecord('entries', id, patch),
      deleteEntry: (id) => deleteRecord('entries', id),
      addBudget,
      updateBudget: (id, patch) => updateRecord('budgets', id, patch),
      deleteBudget: (id) => deleteRecord('budgets', id),
      snapshot,
      syncState,
      syncError,
      syncNow,
      dataReady: Boolean(desiredScope && storageScope === desiredScope),
    };
  }, [
    store,
    addTask,
    updateTask,
    toggleTask,
    addEvent,
    addBook,
    setBookPage,
    addJob,
    addAccount,
    addEntry,
    addBudget,
    deleteRecord,
    updateRecord,
    snapshot,
    syncState,
    syncError,
    syncNow,
    desiredScope,
    storageScope,
  ]);

  return <LifeContext.Provider value={value}>{children}</LifeContext.Provider>;
}

export function useLife() {
  const ctx = useContext(LifeContext);
  if (!ctx) throw new Error('useLife must be used inside LifeProvider');
  return ctx;
}
