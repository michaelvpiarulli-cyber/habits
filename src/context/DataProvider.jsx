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
  statementFromRow,
  statementToRow,
  noteFromRow,
  noteToRow,
  reviewFromRow,
  reviewToRow,
  nutritionFromRow,
  nutritionToRow,
  liftLogFromRow,
  liftLogToRow,
  newId,
  nowISO,
} from '../lib/mappers';
import { todayISO } from '../lib/dates';
import {
  cleanupStarterHabitDuplicates,
  collapseLogsByHabitDay,
  findStarterHabitCounterpart,
  isComplete,
  isKept,
  targetOf,
  valueOf,
  SEED_TIME,
  STARTER_HABITS,
} from '../lib/habits';
import {
  compactMeals,
  emptyNutritionDay,
  normalizeNutritionEntry,
  sumMacros,
} from '../lib/nutrition';

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
  identity: 'tally-identity',
  dayNotes: 'tally-day-notes',
  reviews: 'tally-reviews',
  nutrition: 'tally-nutrition',
  liftLogs: 'tally-lift-logs',
  countdown: 'tally-countdown',
};

/**
 * The date the daily work is pointed at. One date and one label, so it stays a
 * device setting rather than earning a table of its own.
 */
const DEFAULT_COUNTDOWN = { date: '2027-03-27', label: 'Baby due', kind: 'pregnancy' };

/**
 * The starting values, in the user's own words. Fixed ids and a backdated
 * updatedAt for the same reason as the starter habits: two devices seeding
 * before they ever sync collapse to one row, and any later edit wins.
 */
const STARTER_IDENTITY = [
  {
    id: '7a110000-0000-4000-9000-000000000001',
    name: 'Serve God most high',
    note: 'Over everything and anything. Every other value here sits underneath this one.',
      verseRef: 'Joshua 24:15',
    verseText: "As for me and my house, we will serve Yahweh.",
  },
  {
    id: '7a110000-0000-4000-9000-000000000002',
    name: 'Wife and family first',
    note: 'My number one priority in life. Ahead of work, ahead of ambition, ahead of my own comfort.',
      verseRef: 'Ephesians 5:25',
    verseText: "Husbands, love your wives, even as Christ also loved the assembly and gave himself up for it.",
  },
  {
    id: '7a110000-0000-4000-9000-000000000003',
    name: 'Honest, always',
    note: 'I am an honest man who doesn’t lie.',
      verseRef: 'Proverbs 12:22',
    verseText: "Lying lips are an abomination to Yahweh, but those who do the truth are his delight.",
  },
  {
    id: '7a110000-0000-4000-9000-000000000004',
    name: 'Discipline without compromise',
    note: 'I am a man of extreme discipline. I do not compromise.',
      verseRef: '1 Corinthians 9:27',
    verseText: "But I beat my body and bring it into submission.",
  },
  {
    id: '7a110000-0000-4000-9000-000000000005',
    name: 'Chief servant in my home',
    note: 'I lead by serving first. The house is not something I am owed — it is something I carry.',
      verseRef: 'Mark 10:43-44',
    verseText: "Whoever wants to become great among you shall be your servant.",
  },
  {
    id: '7a110000-0000-4000-9000-000000000006',
    name: 'My body is a temple',
    note: 'I treat my body as a temple of the Holy Spirit. The habits on this app are how that gets kept, not a vanity project.',
      verseRef: '1 Corinthians 6:19-20',
    verseText: "Your body is a temple of the Holy Spirit who is in you. Therefore glorify God in your body.",
  },
];

/**
 * The first seeded ids were written with a "ta11" prefix, and `t` is not a hex
 * digit — Postgres would reject every one of them as a malformed uuid on the
 * first sync. They are rewritten to a valid prefix on load, along with the
 * foreign keys that point at them, so anyone who used the app before signing in
 * keeps their history instead of watching it fail to upload.
 */
const BAD_ID_PREFIX = 'ta11';
const GOOD_ID_PREFIX = '7a11';
const fixId = (id) =>
  typeof id === 'string' && id.startsWith(BAD_ID_PREFIX)
    ? GOOD_ID_PREFIX + id.slice(BAD_ID_PREFIX.length)
    : id;

const TABLES = {
  identity: { table: 'identity', from: statementFromRow, to: statementToRow },
  habits: { table: 'habits', from: habitFromRow, to: habitToRow },
  logs: { table: 'habit_logs', from: logFromRow, to: logToRow },
  goals: { table: 'goals', from: goalFromRow, to: goalToRow },
  dayNotes: { table: 'day_notes', from: noteFromRow, to: noteToRow },
  reviews: { table: 'reviews', from: reviewFromRow, to: reviewToRow },
  nutrition: { table: 'nutrition_logs', from: nutritionFromRow, to: nutritionToRow },
  liftLogs: { table: 'lift_logs', from: liftLogFromRow, to: liftLogToRow },
};

/**
 * PostgREST's codes for "that table isn't there". A table added in a later
 * version of the schema may be missing from a project that has not run the
 * migration yet. Keep those rows dirty and surface the error so the data is
 * uploaded once the table exists — clearing dirty here used to strand workouts
 * on the device that logged them.
 */
const MISSING_TABLE_CODES = new Set(['PGRST205', 'PGRST106', '42P01']);
const isMissingTable = (error) => MISSING_TABLE_CODES.has(error?.code);
const isRlsViolation = (error) =>
  error?.code === '42501' || /row-level security/i.test(error?.message || '');
const isUniqueViolation = (error) =>
  error?.code === '23505' || /duplicate key/i.test(error?.message || '');
const missingTableMessage = (table) =>
  `${table}: missing in Supabase — run supabase/schema.sql in the SQL editor, then Sync now`;

const TOMBSTONE_TTL_DAYS = 90;
const PUSH_DEBOUNCE_MS = 700;
const ACCOUNT_KINDS = [
  'habits',
  'logs',
  'goals',
  'identity',
  'dayNotes',
  'reviews',
  'nutrition',
  'liftLogs',
];
const ANONYMOUS_SCOPE = 'anonymous';
const LEGACY_CLAIM_KEY = 'tally-legacy-account';
const migratedKey = (userId) => `tally-account-migrated:${userId}`;
const anonymousClaimedKey = (userId) => `tally-anonymous-claimed:${userId}`;
const scopedKey = (kind, scope) => `${KEYS[kind]}:${scope}`;

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

const emptyDirty = () =>
  Object.fromEntries(ACCOUNT_KINDS.map((kind) => [kind, new Map()]));

function starterHabits({ uniqueIds = false } = {}) {
  return STARTER_HABITS.map((h, i) => ({
    emoji: '',
    cadence: 'daily',
    weekdays: [],
    perWeek: 3,
    target: null,
    unit: '',
    ...h,
    id: uniqueIds ? newId() : h.id,
    archived: false,
    sortOrder: i,
    deleted: false,
    createdAt: nowISO(),
    updatedAt: SEED_TIME,
  }));
}

function starterIdentity({ uniqueIds = false } = {}) {
  return STARTER_IDENTITY.map((statement, i) => ({
    ...statement,
    id: uniqueIds ? newId() : statement.id,
    sortOrder: i,
    deleted: false,
    createdAt: nowISO(),
    updatedAt: SEED_TIME,
  }));
}

function loadScopedRecords(scope) {
  return Object.fromEntries(
    ACCOUNT_KINDS.map((kind) => [
      kind,
      purgeStale(loadList(scopedKey(kind, scope))).map((record) => {
        if (kind === 'habits') return { ...record, id: fixId(record.id) };
        if (kind === 'logs') return { ...record, habitId: fixId(record.habitId) };
        if (kind === 'goals') return { ...record, habitId: fixId(record.habitId) };
        return record;
      }),
    ])
  );
}

/**
 * Old releases used one browser-wide cache. The first account seen after this
 * migration may claim that cache once. Existing ids stay intact so they merge
 * with copies that account may already have uploaded under the old release.
 */
function claimLegacyRecords(userId) {
  if (localStorage.getItem(migratedKey(userId))) return null;
  const claimant = localStorage.getItem(LEGACY_CLAIM_KEY);
  if (claimant && claimant !== userId) {
    localStorage.setItem(migratedKey(userId), 'skipped');
    return null;
  }

  const legacy = Object.fromEntries(
    ACCOUNT_KINDS.map((kind) => [kind, purgeStale(loadList(KEYS[kind]))])
  );
  const hasLegacy = ACCOUNT_KINDS.some((kind) => legacy[kind].length > 0);
  localStorage.setItem(LEGACY_CLAIM_KEY, userId);
  localStorage.setItem(migratedKey(userId), hasLegacy ? 'claimed' : 'empty');
  if (!hasLegacy) return null;

  return {
    habits: legacy.habits.map((habit) => ({
      ...habit,
      id: fixId(habit.id),
      afterId: fixId(habit.afterId),
    })),
    logs: legacy.logs.map((log) => ({
      ...log,
      habitId: fixId(log.habitId),
    })),
    goals: legacy.goals.map((goal) => ({
      ...goal,
      habitId: fixId(goal.habitId),
    })),
    identity: legacy.identity,
    dayNotes: legacy.dayNotes,
    reviews: legacy.reviews,
    nutrition: legacy.nutrition,
    liftLogs: legacy.liftLogs,
  };
}

/**
 * Workouts and habits logged while signed out live under the anonymous scope.
 * Fold them into the account once on first sign-in on this device so they can
 * sync to the computer (and every other signed-in browser).
 */
function claimAnonymousRecords(userId) {
  if (localStorage.getItem(anonymousClaimedKey(userId))) return null;
  const anonymous = loadScopedRecords(ANONYMOUS_SCOPE);
  const hasData = ACCOUNT_KINDS.some((kind) => anonymous[kind].length > 0);
  localStorage.setItem(anonymousClaimedKey(userId), hasData ? 'claimed' : 'empty');
  if (!hasData) return null;

  return {
    habits: anonymous.habits.map((habit) => ({
      ...habit,
      id: fixId(habit.id),
      afterId: fixId(habit.afterId),
    })),
    logs: anonymous.logs.map((log) => ({
      ...log,
      habitId: fixId(log.habitId),
    })),
    goals: anonymous.goals.map((goal) => ({
      ...goal,
      habitId: fixId(goal.habitId),
    })),
    identity: anonymous.identity,
    dayNotes: anonymous.dayNotes,
    reviews: anonymous.reviews,
    nutrition: anonymous.nutrition,
    liftLogs: anonymous.liftLogs,
  };
}

const habitMigrationKey = (habit) =>
  JSON.stringify({
    name: habit.name,
    emoji: habit.emoji || '',
    cadence: habit.cadence,
    weekdays: habit.weekdays || [],
    perWeek: habit.perWeek ?? 3,
    kind: habit.kind || 'check',
    target: habit.target ?? null,
    unit: habit.unit || '',
    floor: habit.floor ?? null,
    cue: habit.cue || '',
    archived: !!habit.archived,
    sortOrder: habit.sortOrder ?? 0,
    updatedAt: habit.updatedAt,
  });

const identityMigrationKey = (statement) =>
  JSON.stringify({
    name: statement.name,
    note: statement.note || '',
    verseRef: statement.verseRef || '',
    verseText: statement.verseText || '',
    sortOrder: statement.sortOrder ?? 0,
    updatedAt: statement.updatedAt,
  });

function referencesStarterHabit(records, starterId) {
  return (
    records.habits.some((habit) => habit.id === starterId || habit.afterId === starterId) ||
    records.logs.some((log) => log.habitId === starterId) ||
    records.goals.some((goal) => goal.habitId === starterId)
  );
}

function withAccountSafeSeedIds(records, remoteHabits, remoteIdentity) {
  const remoteHabitIds = new Set(remoteHabits.map((habit) => habit.id));
  const remoteIdentityIds = new Set(remoteIdentity.map((statement) => statement.id));
  const habitIds = new Map(
    STARTER_HABITS.filter(
      (starter) => referencesStarterHabit(records, starter.id) && !remoteHabitIds.has(starter.id)
    ).flatMap((starter) => {
      const local = records.habits.find((habit) => habit.id === starter.id);
      const seed = {
        emoji: '',
        cadence: 'daily',
        weekdays: [],
        perWeek: 3,
        kind: 'check',
        target: null,
        unit: '',
        floor: null,
        cue: '',
        afterId: null,
        archived: false,
        ...starter,
        sortOrder: STARTER_HABITS.indexOf(starter),
        updatedAt: SEED_TIME,
      };
      const existing =
        (local &&
          remoteHabits.find(
            (habit) => !habit.deleted && habitMigrationKey(habit) === habitMigrationKey(local)
          )) ||
        findStarterHabitCounterpart(local || seed, remoteHabits);
      // Mint a new id only when a local habit row will be uploaded under it.
      // Orphan log/goal references without a habit are dropped at push time.
      if (!existing && !local) return [];
      return [[starter.id, existing?.id || newId()]];
    })
  );
  const identityIds = new Map(
    STARTER_IDENTITY.filter(
      (starter) =>
        records.identity.some((statement) => statement.id === starter.id) &&
        !remoteIdentityIds.has(starter.id)
    ).map((starter) => {
      const local = records.identity.find((statement) => statement.id === starter.id);
      const existing = remoteIdentity.find(
        (statement) =>
          !statement.deleted && identityMigrationKey(statement) === identityMigrationKey(local)
      );
      return [starter.id, existing?.id || newId()];
    })
  );
  const habitId = (id) => (id ? habitIds.get(id) || id : id);
  const identityId = (id) => (id ? identityIds.get(id) || id : id);

  return {
    habits: records.habits.map((habit) => ({
      ...habit,
      id: habitId(habit.id),
      identityId: identityId(habit.identityId),
      afterId: habitId(habit.afterId),
    })),
    logs: records.logs.map((log) => ({
      ...log,
      habitId: habitId(log.habitId),
    })),
    goals: records.goals.map((goal) => ({
      ...goal,
      habitId: habitId(goal.habitId),
    })),
    identity: records.identity.map((statement) => ({
      ...statement,
      id: identityId(statement.id),
    })),
    dayNotes: records.dayNotes,
    reviews: records.reviews,
    nutrition: records.nutrition,
    liftLogs: records.liftLogs,
  };
}

function collapseMigratedIdentityDuplicates(habits, identity) {
  const removedIdentityIds = new Set();
  const identityGroups = new Map();
  for (const statement of identity) {
    if (statement.deleted) continue;
    const key = identityMigrationKey(statement);
    if (!identityGroups.has(key)) identityGroups.set(key, []);
    identityGroups.get(key).push(statement);
  }

  for (const group of identityGroups.values()) {
    if (group.length < 2) continue;
    group.sort((a, b) => {
      const habitsFor = (id) =>
        habits.filter((habit) => !habit.deleted && habit.identityId === id).length;
      return habitsFor(b.id) - habitsFor(a.id) || a.id.localeCompare(b.id);
    });
    group.slice(1).forEach((statement) => removedIdentityIds.add(statement.id));
  }

  return {
    identity: identity.map((statement) =>
      removedIdentityIds.has(statement.id)
        ? { ...statement, deleted: true, updatedAt: nowISO() }
        : statement
    ),
    removedIdentityIds,
  };
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
  const { available, loading: authLoading, user } = useAuth();
  const [habits, setHabits] = useState([]);
  const [logs, setLogs] = useState([]);
  const [goals, setGoals] = useState([]);
  const [identity, setIdentity] = useState([]);
  const [dayNotes, setDayNotes] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [nutrition, setNutrition] = useState([]);
  const [liftLogs, setLiftLogs] = useState([]);
  const [storageScope, setStorageScope] = useState(null);
  const [countdown, setCountdown] = useState(() => {
    try {
      const raw = localStorage.getItem(KEYS.countdown);
      return raw ? { ...DEFAULT_COUNTDOWN, ...JSON.parse(raw) } : DEFAULT_COUNTDOWN;
    } catch {
      return DEFAULT_COUNTDOWN;
    }
  });
  const [syncState, setSyncState] = useState('idle'); // idle | syncing | synced | error
  const [syncError, setSyncError] = useState('');

  // The user id we have already pulled and merged for. Pushes stay parked until
  // that merge lands, so a fresh device cannot overwrite the server with the
  // empty state it started up with.
  const hydratedFor = useRef(null);
  const pushTimer = useRef(null);
  const pulling = useRef(null);
  const syncGeneration = useRef(0);
  const dirty = useRef(emptyDirty());
  const markDirty = useCallback((kind, id) => {
    const revisions = dirty.current[kind];
    revisions.set(id, (revisions.get(id) || 0) + 1);
  }, []);
  const [retryTick, setRetryTick] = useState(0);
  const latest = useRef({
    habits,
    logs,
    goals,
    identity,
    dayNotes,
    reviews,
    nutrition,
    liftLogs,
  });
  latest.current = {
    habits,
    logs,
    goals,
    identity,
    dayNotes,
    reviews,
    nutrition,
    liftLogs,
  };
  const currentUserId = useRef(user?.id);
  currentUserId.current = user?.id;
  const desiredScope = authLoading ? null : user?.id || ANONYMOUS_SCOPE;

  // Switch the entire local cache when auth changes. A render never writes the
  // previous account's records into the next account's namespace.
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

    // Adopt the pre-identity rename before the one-time account migration.
    const virtues = localStorage.getItem('tally-virtues');
    if (virtues && !localStorage.getItem(KEYS.identity)) {
      localStorage.setItem(KEYS.identity, virtues);
      localStorage.removeItem('tally-virtues');
    }

    let records = loadScopedRecords(desiredScope);
    if (user) {
      const claimed = claimLegacyRecords(user.id);
      if (claimed) {
        records = Object.fromEntries(
          ACCOUNT_KINDS.map((kind) => [kind, mergeById(records[kind], claimed[kind])])
        );
      }
      const fromAnonymous = claimAnonymousRecords(user.id);
      if (fromAnonymous) {
        records = Object.fromEntries(
          ACCOUNT_KINDS.map((kind) => [kind, mergeById(records[kind], fromAnonymous[kind])])
        );
      }
    } else {
      const hasScopedData = ACCOUNT_KINDS.some((kind) => records[kind].length > 0);
      const claimant = localStorage.getItem(LEGACY_CLAIM_KEY);
      if (!hasScopedData && !claimant) {
        records = Object.fromEntries(
          ACCOUNT_KINDS.map((kind) => [kind, purgeStale(loadList(KEYS[kind]))])
        );
      }
      if (records.habits.length === 0) records.habits = starterHabits();
      if (records.identity.length === 0) records.identity = starterIdentity();
    }

    setHabits(records.habits);
    setLogs(records.logs);
    setGoals(records.goals);
    setIdentity(records.identity);
    setDayNotes(records.dayNotes);
    setReviews(records.reviews);
    setNutrition(records.nutrition);
    setLiftLogs(records.liftLogs);
    setStorageScope(desiredScope);
    setSyncState(user ? 'syncing' : 'idle');
  }, [desiredScope, storageScope, user]);

  // Already-signed-in sessions after an update still need a one-time fold of
  // any workouts left in the anonymous browser cache.
  useEffect(() => {
    if (!user || storageScope !== user.id) return;
    const fromAnonymous = claimAnonymousRecords(user.id);
    if (!fromAnonymous) return;

    setHabits((prev) => mergeById(prev, fromAnonymous.habits));
    setLogs((prev) => mergeById(prev, fromAnonymous.logs));
    setGoals((prev) => mergeById(prev, fromAnonymous.goals));
    setIdentity((prev) => mergeById(prev, fromAnonymous.identity));
    setDayNotes((prev) => mergeById(prev, fromAnonymous.dayNotes));
    setReviews((prev) => mergeById(prev, fromAnonymous.reviews));
    setNutrition((prev) => mergeById(prev, fromAnonymous.nutrition));
    setLiftLogs((prev) => mergeById(prev, fromAnonymous.liftLogs));

    fromAnonymous.habits.forEach((r) => markDirty('habits', r.id));
    fromAnonymous.logs.forEach((r) => markDirty('logs', r.id));
    fromAnonymous.goals.forEach((r) => markDirty('goals', r.id));
    fromAnonymous.identity.forEach((r) => markDirty('identity', r.id));
    fromAnonymous.dayNotes.forEach((r) => markDirty('dayNotes', r.id));
    fromAnonymous.reviews.forEach((r) => markDirty('reviews', r.id));
    fromAnonymous.nutrition.forEach((r) => markDirty('nutrition', r.id));
    fromAnonymous.liftLogs.forEach((r) => markDirty('liftLogs', r.id));
  }, [user, storageScope, markDirty]);

  // Persist the active account only. Countdown remains a device preference.
  useEffect(() => {
    if (storageScope) localStorage.setItem(scopedKey('habits', storageScope), JSON.stringify(habits));
  }, [habits, storageScope]);
  useEffect(() => {
    if (storageScope) localStorage.setItem(scopedKey('logs', storageScope), JSON.stringify(logs));
  }, [logs, storageScope]);
  useEffect(() => {
    if (storageScope) localStorage.setItem(scopedKey('goals', storageScope), JSON.stringify(goals));
  }, [goals, storageScope]);
  useEffect(() => {
    if (storageScope) localStorage.setItem(scopedKey('identity', storageScope), JSON.stringify(identity));
  }, [identity, storageScope]);
  useEffect(() => {
    if (storageScope)
      localStorage.setItem(scopedKey('dayNotes', storageScope), JSON.stringify(dayNotes));
  }, [dayNotes, storageScope]);
  useEffect(() => {
    if (storageScope) localStorage.setItem(scopedKey('reviews', storageScope), JSON.stringify(reviews));
  }, [reviews, storageScope]);
  useEffect(() => {
    if (storageScope)
      localStorage.setItem(scopedKey('nutrition', storageScope), JSON.stringify(nutrition));
  }, [nutrition, storageScope]);
  useEffect(() => {
    if (storageScope)
      localStorage.setItem(scopedKey('liftLogs', storageScope), JSON.stringify(liftLogs));
  }, [liftLogs, storageScope]);
  useEffect(() => localStorage.setItem(KEYS.countdown, JSON.stringify(countdown)), [countdown]);

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
        results = await Promise.all([
          supabase.from('habits').select('*').eq('user_id', user.id),
          supabase.from('habit_logs').select('*').eq('user_id', user.id),
          supabase.from('goals').select('*').eq('user_id', user.id),
          supabase.from('identity').select('*').eq('user_id', user.id),
          supabase.from('day_notes').select('*').eq('user_id', user.id),
          supabase.from('reviews').select('*').eq('user_id', user.id),
          supabase.from('nutrition_logs').select('*').eq('user_id', user.id),
          supabase.from('lift_logs').select('*').eq('user_id', user.id),
        ]);
      } catch {
        if (pulling.current === generation) pulling.current = null;
        if (syncGeneration.current === generation) {
          setSyncError('Could not reach the sync server.');
          setSyncState('error');
        }
        return;
      }

      // Ignore a response from an account that signed out while requests were
      // in flight. Its rows must never be merged into the next account.
      if (
        syncGeneration.current !== generation ||
        currentUserId.current !== user.id ||
        storageScope !== user.id
      ) {
        if (pulling.current === generation) pulling.current = null;
        return;
      }
      const [h, l, g, v, n, rv, food, lifts] = results;

      const optionalError = [v, n, rv, food, lifts].some(
        (result) => result.error && !isMissingTable(result.error)
      );
      if (h.error || l.error || g.error || optionalError) {
        if (pulling.current === generation) pulling.current = null;
        const failed = [
          ['habits', h],
          ['habit logs', l],
          ['goals', g],
          ['identity', v],
          ['day notes', n],
          ['reviews', rv],
          ['nutrition', food],
          ['lift logs', lifts],
        ].find(([, result]) => result.error && !isMissingTable(result.error));
        setSyncError(
          failed
            ? `${failed[0]}: ${failed[1].error.message || failed[1].error.code}`
            : 'Cloud download failed.'
        );
        setSyncState('error');
        return;
      }

      let local = latest.current;
      const remoteHabits = (h.data || []).map(habitFromRow);
      const remoteIdentity = (v.data || []).map(statementFromRow);
      if (initial) {
        local = withAccountSafeSeedIds(local, remoteHabits, remoteIdentity);
      }
      let mergedHabits = mergeById(remoteHabits, local.habits);
      let mergedLogs = mergeById((l.data || []).map(logFromRow), local.logs);
      let mergedGoals = mergeById((g.data || []).map(goalFromRow), local.goals);
      // identity arrived after the first schema, so a project that has not run
      // the migration reads as "nothing remote" rather than as a failure.
      let mergedIdentity =
        v.error && isMissingTable(v.error)
          ? local.identity
          : mergeById(remoteIdentity, local.identity);
      const mergedNotes =
        n.error && isMissingTable(n.error)
          ? local.dayNotes
          : mergeById((n.data || []).map(noteFromRow), local.dayNotes);
      const mergedReviews =
        rv.error && isMissingTable(rv.error)
          ? local.reviews
          : mergeById((rv.data || []).map(reviewFromRow), local.reviews);
      const mergedNutrition =
        food.error && isMissingTable(food.error)
          ? local.nutrition
          : mergeById((food.data || []).map(nutritionFromRow), local.nutrition);
      const mergedLiftLogs =
        lifts.error && isMissingTable(lifts.error)
          ? local.liftLogs
          : mergeById((lifts.data || []).map(liftLogFromRow), local.liftLogs);

      // Seeds are created only after an account proves empty, and use random
      // ids so two users can never compete for the same primary key.
      if (initial && mergedHabits.length === 0) mergedHabits = starterHabits({ uniqueIds: true });
      if (initial && mergedIdentity.length === 0) {
        mergedIdentity = starterIdentity({ uniqueIds: true });
      }

      const cleanedHabits = cleanupStarterHabitDuplicates(
        mergedHabits,
        mergedLogs,
        mergedGoals
      );
      mergedHabits = cleanedHabits.habits;
      mergedLogs = cleanedHabits.logs;
      mergedGoals = cleanedHabits.goals;
      Object.entries(cleanedHabits.changed).forEach(([kind, ids]) => {
        ids.forEach((id) => markDirty(kind, id));
      });

      const collapsedLogs = collapseLogsByHabitDay(mergedLogs);
      mergedLogs = collapsedLogs.logs;
      collapsedLogs.changed.forEach((id) => markDirty('logs', id));

      const collapsedIdentity = collapseMigratedIdentityDuplicates(
        mergedHabits,
        mergedIdentity
      );
      mergedIdentity = collapsedIdentity.identity;
      collapsedIdentity.removedIdentityIds.forEach((id) => markDirty('identity', id));

      setHabits(mergedHabits);
      setLogs(mergedLogs);
      setGoals(mergedGoals);
      setIdentity(mergedIdentity);
      setDayNotes(mergedNotes);
      setReviews(mergedReviews);
      setNutrition(mergedNutrition);
      setLiftLogs(mergedLiftLogs);

      if (initial) {
        // On first sign-in, send local-only records up. Later pulls only adopt
        // newer remote records; already-dirty local edits remain queued.
        mergedHabits.forEach((r) => markDirty('habits', r.id));
        mergedLogs.forEach((r) => markDirty('logs', r.id));
        mergedGoals.forEach((r) => markDirty('goals', r.id));
        mergedIdentity.forEach((r) => markDirty('identity', r.id));
        mergedNotes.forEach((r) => markDirty('dayNotes', r.id));
        mergedReviews.forEach((r) => markDirty('reviews', r.id));
        mergedNutrition.forEach((r) => markDirty('nutrition', r.id));
        mergedLiftLogs.forEach((r) => markDirty('liftLogs', r.id));
      }

      hydratedFor.current = user.id;
      if (pulling.current === generation) pulling.current = null;
      const anyDirty = Object.values(dirty.current).some((ids) => ids.size > 0);
      setSyncState(anyDirty ? 'syncing' : 'synced');
    },
    [available, user, storageScope, markDirty]
  );

  // --- pull + merge on sign-in ----------------------------------------------
  useEffect(() => {
    if (!available || !user) {
      hydratedFor.current = null;
      setSyncState('idle');
      return;
    }
    if (storageScope !== user.id) return;
    if (hydratedFor.current !== user.id) pullRemote({ initial: true });
  }, [available, user, storageScope, pullRemote]);

  // A second device can change while this one stays signed in. Refresh when the
  // app returns to the foreground, when connectivity returns, and once a minute
  // while it remains open.
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

  // --- debounced push of dirty records --------------------------------------
  useEffect(() => {
    if (
      !available ||
      !user ||
      storageScope !== user.id ||
      hydratedFor.current !== user.id
    ) return;

    const pending = { habits, logs, goals, identity, dayNotes, reviews, nutrition, liftLogs };
    const anyDirty = Object.values(dirty.current).some((s) => s.size > 0);
    if (!anyDirty) return;

    setSyncState('syncing');
    setSyncError('');
    clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(async () => {
      const generation = syncGeneration.current;
      let failed = false;
      let firstError = '';
      const habitIdRewrites = new Map();
      const identityIdRewrites = new Map();
      const logIdRewrites = new Map();
      const liftLogIdRewrites = new Map();
      const knownHabitIds = new Set(pending.habits.map((habit) => habit.id));

      const stillCurrent = () =>
        syncGeneration.current === generation && currentUserId.current === user.id;

      const clearDirty = (kind, revisions) => {
        for (const [id, revision] of revisions) {
          if (dirty.current[kind].get(id) === revision) dirty.current[kind].delete(id);
        }
      };

      /**
       * Upsert one row. When the primary key already belongs to another account
       * (RLS USING on the ON CONFLICT UPDATE path), mint a new id and retry so
       * one poisoned row cannot pin the whole sync queue forever.
       */
      const upsertWithRecovery = async (kind, table, row) => {
        let attempt = row;
        let { error } = await supabase.from(table).upsert(attempt);
        if (!error || isMissingTable(error)) return { error, row: attempt };

        if (kind === 'logs' && isUniqueViolation(error)) {
          const { data: existing } = await supabase
            .from('habit_logs')
            .select('*')
            .eq('habit_id', attempt.habit_id)
            .eq('day', attempt.day)
            .eq('deleted', false)
            .maybeSingle();
          if (existing?.id) {
            const adopted = { ...attempt, id: existing.id };
            if (new Date(attempt.updated_at || 0) >= new Date(existing.updated_at || 0)) {
              ({ error } = await supabase.from(table).upsert(adopted));
              if (!error) {
                if (attempt.id !== adopted.id) logIdRewrites.set(attempt.id, adopted.id);
                return { error: null, row: adopted };
              }
            } else {
              if (attempt.id !== existing.id) logIdRewrites.set(attempt.id, existing.id);
              return { error: null, row: existing };
            }
          }
        }

        if (kind === 'liftLogs' && isUniqueViolation(error)) {
          const { data: existing } = await supabase
            .from('lift_logs')
            .select('*')
            .eq('user_id', attempt.user_id)
            .eq('day', attempt.day)
            .eq('move', attempt.move)
            .eq('deleted', false)
            .maybeSingle();
          if (existing?.id) {
            const adopted = { ...attempt, id: existing.id };
            if (new Date(attempt.updated_at || 0) >= new Date(existing.updated_at || 0)) {
              ({ error } = await supabase.from(table).upsert(adopted));
              if (!error) {
                if (attempt.id !== adopted.id) liftLogIdRewrites.set(attempt.id, adopted.id);
                return { error: null, row: adopted };
              }
            } else {
              if (attempt.id !== existing.id) liftLogIdRewrites.set(attempt.id, existing.id);
              return { error: null, row: existing };
            }
          }
        }

        if (!isRlsViolation(error) && !isUniqueViolation(error)) {
          return { error, row: attempt };
        }

        const replacementId = newId();
        const previousId = attempt.id;
        attempt = { ...attempt, id: replacementId };
        ({ error } = await supabase.from(table).upsert(attempt));
        if (!error) {
          if (kind === 'habits') habitIdRewrites.set(previousId, replacementId);
          else if (kind === 'identity') identityIdRewrites.set(previousId, replacementId);
          else if (kind === 'logs') logIdRewrites.set(previousId, replacementId);
          else if (kind === 'liftLogs') liftLogIdRewrites.set(previousId, replacementId);
        }
        return { error, row: attempt };
      };

      for (const [kind, { table, to }] of Object.entries(TABLES)) {
        if (!stillCurrent()) return;
        const revisions = new Map(dirty.current[kind]);
        if (revisions.size === 0) continue;

        let records = pending[kind].filter((r) => revisions.has(r.id));
        if (kind === 'logs') {
          // Skip orphan logs whose habit never made it into this account — they
          // either point at another user's habit id or at a seed that was dropped.
          const orphans = records.filter((r) => !knownHabitIds.has(r.habitId));
          if (orphans.length) {
            for (const orphan of orphans) {
              if (dirty.current.logs.get(orphan.id) === revisions.get(orphan.id)) {
                dirty.current.logs.delete(orphan.id);
              }
            }
            records = records.filter((r) => knownHabitIds.has(r.habitId));
          }
          const collapsed = collapseLogsByHabitDay(records);
          for (const log of collapsed.logs) {
            if (!log.deleted) continue;
            const idx = pending.logs.findIndex((row) => row.id === log.id);
            if (idx >= 0) pending.logs[idx] = log;
          }
          records = collapsed.logs.filter((r) => revisions.has(r.id));
          if (collapsed.changed.size) {
            setLogs((prev) => {
              const byId = new Map(collapsed.logs.map((log) => [log.id, log]));
              return prev.map((log) => byId.get(log.id) || log);
            });
          }
        }

        const rows = records.map((r) => {
          let record = r;
          if (kind === 'habits') {
            const id = habitIdRewrites.get(r.id) || r.id;
            const afterId = r.afterId ? habitIdRewrites.get(r.afterId) || r.afterId : r.afterId;
            const identityId = r.identityId
              ? identityIdRewrites.get(r.identityId) || r.identityId
              : r.identityId;
            record = { ...r, id, afterId, identityId };
          } else if (kind === 'logs' || kind === 'goals') {
            record = {
              ...r,
              id: kind === 'logs' ? logIdRewrites.get(r.id) || r.id : r.id,
              habitId: r.habitId ? habitIdRewrites.get(r.habitId) || r.habitId : r.habitId,
            };
          } else if (kind === 'identity') {
            record = { ...r, id: identityIdRewrites.get(r.id) || r.id };
          } else if (kind === 'liftLogs') {
            record = { ...r, id: liftLogIdRewrites.get(r.id) || r.id };
          }
          return to(record, user.id);
        });

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
          // Leave dirty so the rows upload once the table is provisioned.
          failed = true;
          if (!firstError) firstError = missingTableMessage(table);
          continue;
        }

        if (error && (isRlsViolation(error) || isUniqueViolation(error))) {
          let rowFailed = false;
          for (const row of rows) {
            if (!stillCurrent()) return;
            let result;
            try {
              result = await upsertWithRecovery(kind, table, row);
            } catch {
              result = { error: { message: 'write failed' }, row };
            }
            if (result.error) {
              if (isMissingTable(result.error)) {
                failed = true;
                if (!firstError) firstError = missingTableMessage(table);
                rowFailed = true;
                continue;
              }
              rowFailed = true;
              if (!firstError) {
                firstError = `${table}: ${result.error.message || result.error.code || 'write failed'}`;
              }
            } else if (kind === 'habits') {
              knownHabitIds.add(result.row.id);
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

        // An edit made while this request was in flight has a newer revision
        // and stays queued for the next pass.
        clearDirty(kind, revisions);
      }

      if (!stillCurrent()) return;

      if (
        habitIdRewrites.size ||
        identityIdRewrites.size ||
        logIdRewrites.size ||
        liftLogIdRewrites.size
      ) {
        const mapHabit = (habit) => ({
          ...habit,
          id: habitIdRewrites.get(habit.id) || habit.id,
          afterId: habit.afterId ? habitIdRewrites.get(habit.afterId) || habit.afterId : habit.afterId,
          identityId: habit.identityId
            ? identityIdRewrites.get(habit.identityId) || habit.identityId
            : habit.identityId,
        });
        const mapLog = (log) => ({
          ...log,
          id: logIdRewrites.get(log.id) || log.id,
          habitId: log.habitId ? habitIdRewrites.get(log.habitId) || log.habitId : log.habitId,
        });
        const mapGoal = (goal) => ({
          ...goal,
          habitId: goal.habitId ? habitIdRewrites.get(goal.habitId) || goal.habitId : goal.habitId,
        });
        const mapIdentity = (statement) => ({
          ...statement,
          id: identityIdRewrites.get(statement.id) || statement.id,
        });
        const mapLiftLog = (entry) => ({
          ...entry,
          id: liftLogIdRewrites.get(entry.id) || entry.id,
        });
        if (habitIdRewrites.size || identityIdRewrites.size) {
          setHabits((prev) => prev.map(mapHabit));
        }
        if (habitIdRewrites.size || logIdRewrites.size) {
          setLogs((prev) => prev.map(mapLog));
        }
        if (habitIdRewrites.size) setGoals((prev) => prev.map(mapGoal));
        if (identityIdRewrites.size) setIdentity((prev) => prev.map(mapIdentity));
        if (liftLogIdRewrites.size) setLiftLogs((prev) => prev.map(mapLiftLog));
      }

      const stillDirty = Object.values(dirty.current).some((records) => records.size > 0);
      setSyncError(firstError);
      setSyncState(failed ? 'error' : stillDirty ? 'syncing' : 'synced');
    }, PUSH_DEBOUNCE_MS);

    return () => clearTimeout(pushTimer.current);
  }, [
    habits,
    logs,
    goals,
    identity,
    dayNotes,
    reviews,
    nutrition,
    liftLogs,
    available,
    user,
    storageScope,
    retryTick,
  ]);

  const syncNow = useCallback(() => {
    setRetryTick((tick) => tick + 1);
    if (available && user && storageScope === user.id) pullRemote();
  }, [available, user, storageScope, pullRemote]);

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

  /**
   * Days that cleared the FLOOR — the chain, as opposed to the scoreboard.
   * Streaks read this so that showing up in a reduced way still counts, while
   * completion rate keeps reading doneSets and stays honest about targets.
   */
  const keptSets = useMemo(() => {
    const map = new Map();
    for (const [habitId, byDay] of logIndex) {
      const habit = habitById.get(habitId);
      if (!habit) continue;
      const set = new Set();
      for (const [day, log] of byDay) if (isKept(habit, log)) set.add(day);
      map.set(habitId, set);
    }
    return map;
  }, [logIndex, habitById]);

  const doneSetFor = useCallback((habitId) => doneSets.get(habitId) || new Set(), [doneSets]);
  const keptSetFor = useCallback((habitId) => keptSets.get(habitId) || new Set(), [keptSets]);

  /**
   * Every completed day of every habit pointed at a statement is one vote for
   * being that person. This is the whole argument for writing the identity down
   * — it turns the list from something you read into something you accumulate.
   */
  const votesFor = useCallback(
    (statementId) =>
      habits
        .filter((h) => !h.deleted && h.identityId === statementId)
        .reduce((sum, h) => sum + (doneSets.get(h.id)?.size ?? 0), 0),
    [habits, doneSets]
  );

  /** Habits casting votes for a statement, for the "from …" line. */
  const habitsForStatement = useCallback(
    (statementId) => habits.filter((h) => !h.deleted && !h.archived && h.identityId === statementId),
    [habits]
  );

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
        floor: fields.floor ?? null,
        identityId: fields.identityId || null,
        cue: fields.cue || '',
        afterId: fields.afterId || null,
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

  const addStatement = useCallback(
    (fields) => {
      const statement = {
        id: newId(),
        name: fields.name.trim(),
        note: (fields.note || '').trim(),
        verseRef: (fields.verseRef || '').trim(),
        verseText: (fields.verseText || '').trim(),
        sortOrder: identity.length,
        deleted: false,
        createdAt: nowISO(),
        updatedAt: nowISO(),
      };
      setIdentity((prev) => [...prev, statement]);
      markDirty('identity', statement.id);
      return statement;
    },
    [identity.length, markDirty]
  );

  const updateStatement = useCallback(
    (id, patch) => {
      setIdentity((prev) =>
        prev.map((v) => (v.id === id ? { ...v, ...patch, updatedAt: nowISO() } : v))
      );
      markDirty('identity', id);
    },
    [markDirty]
  );

  const deleteStatement = useCallback((id) => updateStatement(id, { deleted: true }), [updateStatement]);

  const activeIdentity = useMemo(
    () =>
      identity
        .filter((v) => !v.deleted)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt)),
    [identity]
  );

  /**
   * One statement per day, cycling through the list by date. Deterministic rather
   * than random so it is the same all day and on every device — and so the
   * whole list comes round rather than the same two surfacing forever.
   */
  /** The day's note, or '' — one row per day, keyed by the date. */
  const noteFor = useCallback(
    (day) => dayNotes.find((n) => !n.deleted && n.day === day)?.text || '',
    [dayNotes]
  );

  const setDayNote = useCallback(
    (day, text) => {
      const trimmed = text.trim();
      setDayNotes((prev) => {
        const existing = prev.find((n) => n.day === day);
        if (existing) {
          markDirty('dayNotes', existing.id);
          return prev.map((n) =>
            n.id === existing.id
              ? { ...n, text: trimmed, deleted: trimmed === '', updatedAt: nowISO() }
              : n
          );
        }
        if (!trimmed) return prev;
        const note = {
          id: newId(),
          day,
          text: trimmed,
          deleted: false,
          createdAt: nowISO(),
          updatedAt: nowISO(),
        };
        markDirty('dayNotes', note.id);
        return [...prev, note];
      });
    },
    [markDirty]
  );

  const activeNotes = useMemo(
    () => dayNotes.filter((n) => !n.deleted && n.text).sort((a, b) => (a.day < b.day ? 1 : -1)),
    [dayNotes]
  );

  const reviewFor = useCallback(
    (weekStart) => reviews.find((r) => !r.deleted && r.weekStart === weekStart) || null,
    [reviews]
  );

  const saveReview = useCallback(
    (weekStart, fields) => {
      setReviews((prev) => {
        const existing = prev.find((r) => r.weekStart === weekStart);
        if (existing) {
          markDirty('reviews', existing.id);
          return prev.map((r) =>
            r.id === existing.id ? { ...r, ...fields, deleted: false, updatedAt: nowISO() } : r
          );
        }
        const review = {
          id: newId(),
          weekStart,
          held: '',
          compromised: '',
          focus: '',
          scores: {},
          ...fields,
          deleted: false,
          createdAt: nowISO(),
          updatedAt: nowISO(),
        };
        markDirty('reviews', review.id);
        return [...prev, review];
      });
    },
    [markDirty]
  );

  const activeReviews = useMemo(
    () => reviews.filter((r) => !r.deleted).sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1)),
    [reviews]
  );

  const nutritionFor = useCallback(
    (day) => {
      const entry = nutrition.find((row) => !row.deleted && row.day === day);
      return normalizeNutritionEntry(entry) || emptyNutritionDay(day);
    },
    [nutrition]
  );

  const writeNutritionDay = useCallback(
    (day, meals) => {
      const cleaned = compactMeals(meals).map((meal) => {
        const id =
          !meal.id || String(meal.id).startsWith('slot-') || String(meal.id).startsWith('legacy-')
            ? newId()
            : meal.id;
        const foods = Array.isArray(meal.foods)
          ? meal.foods.map((food) => ({
              id: food.id && !String(food.id).startsWith('slot-') ? food.id : newId(),
              name: food.name || '',
              brand: food.brand || '',
              serving: food.serving || '',
              fdcId: food.fdcId || null,
              source: food.source || '',
              calories: Math.max(0, Number(food.calories) || 0),
              protein: Math.max(0, Number(food.protein) || 0),
              carbs: Math.max(0, Number(food.carbs) || 0),
              fat: Math.max(0, Number(food.fat) || 0),
            }))
          : [];
        return {
          id,
          slot: meal.slot || 'snack',
          label: meal.label || '',
          note: meal.note || '',
          foods,
          calories: Math.max(0, Number(meal.calories) || 0),
          protein: Math.max(0, Number(meal.protein) || 0),
          carbs: Math.max(0, Number(meal.carbs) || 0),
          fat: Math.max(0, Number(meal.fat) || 0),
        };
      });
      const totals = sumMacros(cleaned);
      const empty = cleaned.length === 0;

      setNutrition((prev) => {
        const existing = prev.find((entry) => entry.day === day);
        if (existing) {
          markDirty('nutrition', existing.id);
          return prev.map((entry) =>
            entry.id === existing.id
              ? {
                  ...entry,
                  ...totals,
                  meals: cleaned,
                  deleted: empty,
                  updatedAt: nowISO(),
                }
              : entry
          );
        }
        if (empty) return prev;
        const entry = {
          id: newId(),
          day,
          ...totals,
          meals: cleaned,
          deleted: false,
          createdAt: nowISO(),
          updatedAt: nowISO(),
        };
        markDirty('nutrition', entry.id);
        return [...prev, entry];
      });

      return { ...totals, meals: cleaned };
    },
    [markDirty]
  );

  /** Replace the day's meals; day totals are recomputed from the list. */
  const saveMeals = useCallback((day, meals) => writeNutritionDay(day, meals), [writeNutritionDay]);

  /**
   * Back-compat for a flat day total. Becomes a single "Earlier log" meal when
   * the day has no meal list yet; otherwise ignored in favor of saveMeals.
   */
  const saveNutrition = useCallback(
    (day, fields) => {
      const meal = {
        id: newId(),
        slot: 'day',
        label: 'Earlier log',
        note: '',
        calories: Math.max(0, Number(fields.calories) || 0),
        protein: Math.max(0, Number(fields.protein) || 0),
        carbs: Math.max(0, Number(fields.carbs) || 0),
        fat: Math.max(0, Number(fields.fat) || 0),
      };
      return writeNutritionDay(day, [meal]);
    },
    [writeNutritionDay]
  );

  const liftLogFor = useCallback(
    (day, move) => liftLogs.find((entry) => !entry.deleted && entry.day === day && entry.move === move) || null,
    [liftLogs]
  );

  /**
   * Most recent logged performance for a movement before `beforeDay`
   * (exclusive). Used to prescribe today's target without counting today's
   * in-progress log as history.
   */
  const lastLiftLog = useCallback(
    (move, beforeDay) => {
      let best = null;
      for (const entry of liftLogs) {
        if (entry.deleted || entry.move !== move) continue;
        if (beforeDay && entry.day >= beforeDay) continue;
        if (
          !best ||
          entry.day > best.day ||
          (entry.day === best.day && entry.updatedAt > best.updatedAt)
        ) {
          best = entry;
        }
      }
      return best;
    },
    [liftLogs]
  );

  const saveLiftLog = useCallback(
    (day, fields) => {
      const move = String(fields.move || '').trim();
      if (!move) return;

      const loadKind = fields.loadKind || 'barbell';
      const setEntries = Array.isArray(fields.setEntries)
        ? fields.setEntries
            .map((entry) => ({
              loadLb:
                loadKind === 'bodyweight' || loadKind === 'cardio'
                  ? null
                  : entry.loadLb == null
                    ? null
                    : Math.max(0, Number(entry.loadLb) || 0),
              reps: Math.max(0, Number(entry.reps) || 0),
            }))
            .filter((entry) => entry.reps > 0)
        : [];

      const loadLb =
        loadKind === 'bodyweight' || loadKind === 'cardio'
          ? null
          : setEntries.length
            ? Math.max(...setEntries.map((entry) => Number(entry.loadLb) || 0))
            : Math.max(0, Number(fields.loadLb) || 0);
      const sets = setEntries.length || Math.max(0, Number(fields.sets) || 0);
      const reps = setEntries.length
        ? Math.min(...setEntries.map((entry) => entry.reps))
        : Math.max(0, Number(fields.reps) || 0);
      const empty = sets <= 0 || reps <= 0;

      setLiftLogs((prev) => {
        const existing = prev.find((entry) => entry.day === day && entry.move === move);
        if (existing) {
          markDirty('liftLogs', existing.id);
          return prev.map((entry) =>
            entry.id === existing.id
              ? {
                  ...entry,
                  loadKind,
                  loadLb,
                  sets: empty ? entry.sets : sets,
                  reps: empty ? entry.reps : reps,
                  setEntries: empty ? [] : setEntries,
                  deleted: empty,
                  updatedAt: nowISO(),
                }
              : entry
          );
        }
        if (empty) return prev;
        const entry = {
          id: newId(),
          day,
          move,
          loadKind,
          loadLb,
          sets,
          reps,
          setEntries,
          deleted: false,
          createdAt: nowISO(),
          updatedAt: nowISO(),
        };
        markDirty('liftLogs', entry.id);
        return [...prev, entry];
      });
    },
    [markDirty]
  );

  /**
   * Everything, as one JSON file. Deliberately the raw records rather than a
   * prettied report: the point is that a copy exists off the device and can be
   * read back, not that it looks nice.
   */
  const exportAll = useCallback(() => {
    const payload = {
      app: 'tally',
      version: 1,
      exportedAt: nowISO(),
      habits,
      logs,
      goals,
      identity,
      dayNotes,
      reviews,
      nutrition,
      liftLogs,
      countdown,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tally-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [habits, logs, goals, identity, dayNotes, reviews, nutrition, liftLogs, countdown]);

  const statementOfDay = useMemo(() => {
    if (activeIdentity.length === 0) return null;
    const epochDay = Math.floor(new Date(`${todayISO()}T12:00:00`).getTime() / 86400000);
    return activeIdentity[epochDay % activeIdentity.length];
  }, [activeIdentity]);

  const value = {
    habits,
    activeHabits,
    archivedHabits,
    goals: activeGoals,
    identity: activeIdentity,
    statementOfDay,
    addStatement,
    updateStatement,
    deleteStatement,
    noteFor,
    setDayNote,
    notes: activeNotes,
    reviewFor,
    saveReview,
    reviews: activeReviews,
    nutritionFor,
    saveNutrition,
    saveMeals,
    liftLogFor,
    lastLiftLog,
    saveLiftLog,
    exportAll,
    countdown,
    setCountdown,
    doneSets,
    doneSetFor,
    keptSets,
    keptSetFor,
    votesFor,
    habitsForStatement,
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
    syncError,
    syncNow,
    syncAvailable: isSupabaseConfigured,
    dataReady: Boolean(desiredScope && storageScope === desiredScope),
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
