import { useCallback, useEffect, useState } from 'react';
import { useGoogle } from '../context/GoogleProvider';
import { checkKey, toggleSlot, withDayComplete } from '../lib/biblePlan';
import { HOUSEHOLD_OWNER_ID } from '../lib/household';
import { visibleWorkouts } from '../lib/program';
import { supabase } from '../lib/supabase';

const BIBLE_KEY = 'tally.bible.v1';
const MISSING = new Set(['PGRST205', 'PGRST106', '42P01']);

function missing(error) {
  return MISSING.has(error?.code);
}

function readBible() {
  try {
    const parsed = JSON.parse(localStorage.getItem(BIBLE_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function mapWorkout(row) {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    days: row.days || [],
    pattern: row.pattern || 'weekly',
    startTime: row.start_time || '',
    endTime: row.end_time || '',
    exercises: Array.isArray(row.exercises) ? row.exercises : [],
    sortOrder: row.sort_order || 0,
    deleted: !!row.deleted,
    updatedAt: row.updated_at,
  };
}

export function useProgram() {
  const [state, setState] = useState(() => ({ ready: false, ...visibleWorkouts({ adopted: false }), warning: '' }));

  const load = useCallback(async () => {
    if (!supabase) {
      setState({ ready: true, ...visibleWorkouts({ adopted: false }), warning: '' });
      return;
    }
    const [meta, rows] = await Promise.all([
      supabase.from('training_program').select('adopted, updated_at').eq('user_id', HOUSEHOLD_OWNER_ID).maybeSingle(),
      supabase.from('program_workouts').select('*').eq('user_id', HOUSEHOLD_OWNER_ID).eq('deleted', false),
    ]);
    if (missing(meta.error) || missing(rows.error)) {
      setState({
        ready: true,
        ...visibleWorkouts({ adopted: false }),
        warning: 'Run supabase/add-jeno-program.sql once so JENO can store the program.',
      });
      return;
    }
    if (meta.error || rows.error) {
      setState((prev) => ({
        ...prev,
        ready: true,
        warning: meta.error?.message || rows.error?.message || 'Could not load the program.',
      }));
      return;
    }
    const workouts = (rows.data || []).map(mapWorkout);
    const adopted = Boolean(meta.data?.adopted) || workouts.length > 0;
    setState({
      ready: true,
      ...visibleWorkouts({ adopted, workouts }),
      warning: '',
      updatedAt: meta.data?.updated_at || '',
    });
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 60000);
    const onVisible = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  return state;
}

export function useJenoActivity() {
  const [activity, setActivity] = useState([]);
  const [warning, setWarning] = useState('');

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('jeno_activity')
      .select('*')
      .eq('user_id', HOUSEHOLD_OWNER_ID)
      .order('created_at', { ascending: false })
      .limit(40);
    if (missing(error)) {
      setWarning('');
      return;
    }
    if (error) {
      setWarning(error.message || 'Could not load the JENO inbox.');
      return;
    }
    setWarning('');
    setActivity(
      (data || []).map((row) => ({
        id: row.id,
        kind: row.kind,
        action: row.action,
        summary: row.summary,
        detail: row.detail || {},
        day: row.day,
        createdAt: row.created_at,
        deleted: false,
      }))
    );
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 60000);
    const onVisible = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  return { activity, warning };
}

export function useBible() {
  const [checks, setChecks] = useState(readBible);

  useEffect(() => {
    localStorage.setItem(BIBLE_KEY, JSON.stringify(checks));
  }, [checks]);

  useEffect(() => {
    if (!supabase) return undefined;
    let cancel = false;
    supabase
      .from('bible_checks')
      .select('*')
      .eq('user_id', HOUSEHOLD_OWNER_ID)
      .eq('deleted', false)
      .then(({ data, error }) => {
        if (cancel || error || !data) return;
        setChecks((local) => {
          const next = { ...local };
          for (const row of data) {
            const key = checkKey(row.year, row.day_index);
            const remoteAt = row.updated_at || '';
            if (!next[key] || remoteAt >= (next[key].updatedAt || '')) {
              next[key] = { slots: row.slots || [], updatedAt: remoteAt, id: row.id };
            }
          }
          return next;
        });
      });
    return () => {
      cancel = true;
    };
  }, []);

  const persist = useCallback((next, year, index) => {
    setChecks(next);
    if (!supabase) return;
    const key = checkKey(year, index);
    const row = next[key];
    if (!row) return;
    const id = row.id || crypto.randomUUID();
    if (!row.id) {
      setChecks((current) => ({ ...current, [key]: { ...current[key], id } }));
    }
    supabase.from('bible_checks').upsert({
      id,
      user_id: HOUSEHOLD_OWNER_ID,
      year,
      day_index: index,
      slots: row.slots,
      deleted: false,
      updated_at: row.updatedAt,
    }).then(() => {});
  }, []);

  const toggle = useCallback(
    (year, index, slot) => {
      const now = new Date().toISOString();
      const next = toggleSlot(checks, year, index, slot, now);
      const key = checkKey(year, index);
      next[key] = { ...next[key], id: checks[key]?.id };
      persist(next, year, index);
    },
    [checks, persist]
  );

  const completeDay = useCallback(
    (year, index) => {
      const now = new Date().toISOString();
      const next = withDayComplete(checks, year, index, now);
      const key = checkKey(year, index);
      next[key] = { ...next[key], id: checks[key]?.id };
      persist(next, year, index);
    },
    [checks, persist]
  );

  return { checks, toggle, completeDay };
}

export function useGoogleAgenda(from, to) {
  const google = useGoogle();
  const [events, setEvents] = useState([]);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!google.connected) {
      setEvents([]);
      setNote('');
      return undefined;
    }
    let cancel = false;
    google
      .listEvents(from, to)
      .then((items) => {
        if (!cancel) {
          setEvents(items || []);
          setNote('');
        }
      })
      .catch((err) => {
        if (!cancel) setNote(err.message || 'Could not read Google Calendar.');
      });
    return () => {
      cancel = true;
    };
  }, [google, from, to]);

  return { ...google, events, note };
}
