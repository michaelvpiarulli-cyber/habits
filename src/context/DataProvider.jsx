import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import {
  goalFromRow,
  goalToRow,
  habitFromRow,
  habitToRow,
  logFromRow,
  logToRow,
  newId,
  nowISO,
} from '../lib/mappers';
import { todayISO } from '../lib/dates';
import { isComplete, targetOf, valueOf, SEED_TIME, STARTER_HABITS } from '../lib/habits';

/**
 * Single owner of habits, logs, and goals.
 *
 * Local-first. localStorage is the immediate source of truth, so checking a box
 * never waits on the network and the whole app works offline. When signed in,
 * state is merged with Supabase on login and pushed up again on a debounce.
 *
 * Conflict resolution is last-write-wins per record, which is the right call
 * here: records are small and independent, one person is editing them, and the
 * realistic conflict is the same phone reconnecting rather than two devices
 * disagreeing about the same habit in the same second.
 */

const KEYS = {
  habits: 'tally-habits',
  logs: 'tally-logs',
  goals: 'tally-goals',
};

const TABLES = {
  habits: { table: 'habits', from: habitFromRow, to: habitToRow },
  logs: { table: 'habit_logs', from: logFromRow, to: logToRow },
  goals: { table: 'goals', from: goalFromRow, to: goalToRow },
};

const TOMBSTONE_TTL_DAYS = 90;
const PUSH_DEBOUNCE_MS = 700;

function loadList(key) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Drop tombstones nobody needs any more, so the local list cannot grow forever. */
function purgeStale(list) {
  const cutoff = Date.now() - TOMBSTONE_TTL_DAYS * 86400000;
  return list.filter((r) => !r.deleted || new Date(r.updatedAt).getTime() > cutoff);
}

/** Union two lists by id; the more recently touched copy of a record wins. */
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

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { available, user } = useAuth();

  const [habits, setHabits] = useState(() => {
    const stored = purgeStale(loadList(KEYS.habits));
    // A first run opens on the real routine instead of an empty list. Fixed ids
    // and a backdated SEED_TIME (see lib/habits) keep this safe to run on more
    // than one device: the copies merge into one, and any later edit wins.
    if (stored.length > 0) return stored;
    return STARTER_HABITS.map((h, i) => ({
      emoji: '',
      cadence: 'daily',
      weekdays: [],
      perWeek: 3,
      target: null,
      unit: '',
      ...h,
      archived: false,
      sortOrder: i,
      deleted: false,
      createdAt: nowISO(),
      updatedAt: SEED_TIME,
    }));
  });
  const [logs, setLogs] = useState(() => purgeStale(loadList(KEYS.logs)));
  const [goals, setGoals] = useState(() => purgeStale(loadList(KEYS.goals)));
  const [syncState, setSyncState] = useState('idle'); // idle | syncing | synced | error

  // Persist locally on every change — the instant, offline layer.
  useEffect(() => localStorage.setItem(KEYS.habits, JSON.stringify(habits)), [habits]);
  useEffect(() => localStorage.setItem(KEYS.logs, JSON.stringify(logs)), [logs]);
  useEffect(() => localStorage.setItem(KEYS.goals, JSON.stringify(goals)), [goals]);

  // Ids touched since the last successful push. Only these get sent, so a
  // three-year backlog of logs is not re-uploaded every time a box is ticked.
  const dirty = useRef({ habits: new Set(), logs: new Set(), goals: new Set() });
  const markDirty = useCallback((kind, id) => dirty.current[kind].add(id), []);

  // The user id we have already pulled and merged for. Pushes stay parked until
  // that merge lands, so a fresh device cannot overwrite the server with the
  // empty state it started up with.
  const hydratedFor = useRef(null);
  const pushTimer = useRef(null);

  // --- pull + merge on sign-in ----------------------------------------------
  useEffect(() => {
    if (!available || !user) {
      hydratedFor.current = null;
      setSyncState('idle');
      return;
    }
    if (hydratedFor.current === user.id) return;

    let cancelled = false;
    (async () => {
      setSyncState('syncing');

      const [h, l, g] = await Promise.all([
        supabase.from('habits').select('*').eq('user_id', user.id),
        supabase.from('habit_logs').select('*').eq('user_id', user.id),
        supabase.from('goals').select('*').eq('user_id', user.id),
      ]);

      if (cancelled) return;
      if (h.error || l.error || g.error) {
        setSyncState('error');
        return;
      }

      const mergedHabits = mergeById((h.data || []).map(habitFromRow), habits);
      const mergedLogs = mergeById((l.data || []).map(logFromRow), logs);
      const mergedGoals = mergeById((g.data || []).map(goalFromRow), goals);

      setHabits(mergedHabits);
      setLogs(mergedLogs);
      setGoals(mergedGoals);

      // Everything local that the server has not seen needs to go up. Marking
      // the whole merged set is the simple, correct version of that: upserts
      // are idempotent, and this only runs once per sign-in.
      mergedHabits.forEach((r) => dirty.current.habits.add(r.id));
      mergedLogs.forEach((r) => dirty.current.logs.add(r.id));
      mergedGoals.forEach((r) => dirty.current.goals.add(r.id));

      hydratedFor.current = user.id;
      setSyncState('syncing'); // the push effect below takes it from here
    })();

    return () => {
      cancelled = true;
    };
    // Keyed on identity alone: the local state is merged once per sign-in, not
    // re-merged on every subsequent edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available, user]);

  // --- debounced push of dirty records --------------------------------------
  useEffect(() => {
    if (!available || !user || hydratedFor.current !== user.id) return;

    const pending = { habits, logs, goals };
    const anyDirty = Object.values(dirty.current).some((s) => s.size > 0);
    if (!anyDirty) return;

    setSyncState('syncing');
    clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(async () => {
      let failed = false;

      for (const [kind, { table, to }] of Object.entries(TABLES)) {
        const ids = dirty.current[kind];
        if (ids.size === 0) continue;

        const rows = pending[kind].filter((r) => ids.has(r.id)).map((r) => to(r, user.id));
        if (rows.length === 0) {
          ids.clear();
          continue;
        }

        const { error } = await supabase.from(table).upsert(rows);
        // Clear only on success — a failed batch stays dirty and retries on the
        // next edit rather than being silently dropped.
        if (error) failed = true;
        else ids.clear();
      }

      setSyncState(failed ? 'error' : 'synced');
    }, PUSH_DEBOUNCE_MS);

    return () => clearTimeout(pushTimer.current);
  }, [habits, logs, goals, available, user]);

  // --- derived --------------------------------------------------------------

  const activeHabits = useMemo(
    () =>
      habits
        .filter((h) => !h.deleted && !h.archived)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt)),
    [habits]
  );

  const archivedHabits = useMemo(
    () => habits.filter((h) => !h.deleted && h.archived).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [habits]
  );

  const habitById = useMemo(() => new Map(habits.map((h) => [h.id, h])), [habits]);

  /** habitId → { day → log }. One lookup table the views index into by date. */
  const logIndex = useMemo(() => {
    const map = new Map();
    for (const log of logs) {
      if (log.deleted) continue;
      if (!map.has(log.habitId)) map.set(log.habitId, new Map());
      map.get(log.habitId).set(log.day, log);
    }
    return map;
  }, [logs]);

  /**
   * habitId → Set of days that actually cleared the target. Streaks read this,
   * so a two-of-three-walks day counts as recorded but not as done.
   */
  const doneSets = useMemo(() => {
    const map = new Map();
    for (const [habitId, byDay] of logIndex) {
      const habit = habitById.get(habitId);
      if (!habit) continue;
      const set = new Set();
      for (const [day, log] of byDay) if (isComplete(habit, log)) set.add(day);
      map.set(habitId, set);
    }
    return map;
  }, [logIndex, habitById]);

  const doneSetFor = useCallback((habitId) => doneSets.get(habitId) || new Set(), [doneSets]);

  /** Live log for a habit on a day, if there is one. */
  const logFor = useCallback(
    (habitId, day) => logIndex.get(habitId)?.get(day) || null,
    [logIndex]
  );

  /** The number recorded on a day: walks taken, grams eaten, 1 or 0 for a check. */
  const valueFor = useCallback(
    (habit, day) => valueOf(habit, logIndex.get(habit.id)?.get(day) || null),
    [logIndex]
  );

  const activeGoals = useMemo(
    () => goals.filter((g) => !g.deleted).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [goals]
  );

  /**
   * Goals tied to a habit read their progress off that habit's completions, so
   * there is never a second number to keep up to date by hand.
   */
  const goalProgress = useCallback(
    (goal) => (goal.habitId ? (doneSets.get(goal.habitId)?.size ?? 0) : goal.progress),
    [doneSets]
  );

  // --- mutators -------------------------------------------------------------

  const addHabit = useCallback(
    (fields) => {
      const habit = {
        id: newId(),
        name: fields.name.trim(),
        emoji: fields.emoji || '',
        cadence: fields.cadence || 'daily',
        weekdays: fields.weekdays || [],
        perWeek: fields.perWeek ?? 3,
        kind: fields.kind || 'check',
        target: fields.target ?? null,
        unit: fields.unit || '',
        archived: false,
        sortOrder: habits.length,
        deleted: false,
        createdAt: nowISO(),
        updatedAt: nowISO(),
      };
      setHabits((prev) => [...prev, habit]);
      markDirty('habits', habit.id);
      return habit;
    },
    [habits.length, markDirty]
  );

  const updateHabit = useCallback(
    (id, patch) => {
      setHabits((prev) =>
        prev.map((h) => (h.id === id ? { ...h, ...patch, updatedAt: nowISO() } : h))
      );
      markDirty('habits', id);
    },
    [markDirty]
  );

  /** Soft delete, so the removal reaches other devices instead of being undone by them. */
  const deleteHabit = useCallback(
    (id) => {
      updateHabit(id, { deleted: true });
      setLogs((prev) =>
        prev.map((l) => {
          if (l.habitId !== id || l.deleted) return l;
          markDirty('logs', l.id);
          return { ...l, deleted: true, updatedAt: nowISO() };
        })
      );
    },
    [updateHabit, markDirty]
  );

  /**
   * The one write path for a day's value. Every other log mutator goes through
   * it, so "what does zero mean" and "when is a tombstone written" are decided
   * once here rather than in each caller.
   */
  const setValue = useCallback(
    (habit, day, value) => {
      const amount = habit.kind === 'check' ? null : Math.max(0, Number(value) || 0);
      const cleared = habit.kind === 'check' ? value <= 0 : amount === 0;

      setLogs((prev) => {
        const existing = prev.find((l) => l.habitId === habit.id && l.day === day);

        if (existing) {
          markDirty('logs', existing.id);
          // Clearing writes a tombstone rather than dropping the row, so the
          // removal reaches other devices instead of being undone by them.
          return prev.map((l) =>
            l.id === existing.id
              ? { ...l, amount, deleted: cleared, updatedAt: nowISO() }
              : l
          );
        }

        if (cleared) return prev; // nothing logged, nothing to clear
        const log = {
          id: newId(),
          habitId: habit.id,
          day,
          amount,
          note: '',
          deleted: false,
          createdAt: nowISO(),
          updatedAt: nowISO(),
        };
        markDirty('logs', log.id);
        return [...prev, log];
      });
    },
    [markDirty]
  );

  /** Fill the day to its target, or wipe it if it is already complete. */
  const toggleDay = useCallback(
    (habit, day = todayISO()) => {
      const done = isComplete(habit, logIndex.get(habit.id)?.get(day) || null);
      setValue(habit, day, done ? 0 : targetOf(habit));
    },
    [logIndex, setValue]
  );

  /**
   * One rep at a time for count habits. Tapping past the target wraps back to
   * zero, which makes an over-tap a single extra tap to fix rather than a trip
   * into an editor.
   */
  const bumpDay = useCallback(
    (habit, day = todayISO(), delta = 1) => {
      const current = valueOf(habit, logIndex.get(habit.id)?.get(day) || null);
      const next = current + delta;
      setValue(habit, day, next > targetOf(habit) ? 0 : Math.max(0, next));
    },
    [logIndex, setValue]
  );

  const addGoal = useCallback(
    (fields) => {
      const goal = {
        id: newId(),
        title: fields.title.trim(),
        detail: fields.detail || '',
        target: Number(fields.target) || 1,
        progress: 0,
        unit: fields.unit || '',
        habitId: fields.habitId || null,
        dueDate: fields.dueDate || null,
        done: false,
        deleted: false,
        createdAt: nowISO(),
        updatedAt: nowISO(),
      };
      setGoals((prev) => [...prev, goal]);
      markDirty('goals', goal.id);
      return goal;
    },
    [markDirty]
  );

  const updateGoal = useCallback(
    (id, patch) => {
      setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch, updatedAt: nowISO() } : g)));
      markDirty('goals', id);
    },
    [markDirty]
  );

  const deleteGoal = useCallback((id) => updateGoal(id, { deleted: true }), [updateGoal]);

  const value = {
    habits,
    activeHabits,
    archivedHabits,
    goals: activeGoals,
    doneSets,
    doneSetFor,
    logFor,
    valueFor,
    goalProgress,
    addHabit,
    updateHabit,
    deleteHabit,
    setValue,
    toggleDay,
    bumpDay,
    addGoal,
    updateGoal,
    deleteGoal,
    syncState,
    syncAvailable: isSupabaseConfigured,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
