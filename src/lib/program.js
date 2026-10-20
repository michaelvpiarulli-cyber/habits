/**
 * Weekly training program.
 *
 * Strength A / B and the Tue–Thu–Sat walk ship as seed data. JENO overwrites
 * that program through /api/program. Michael's screens only display the result.
 * Sets, reps, and loads on the seed are placeholders until JENO replaces them.
 */

import { dow } from './dates.js';
import { workoutFor } from './workouts.js';

export const SEED_A_ID = '11111111-1111-4111-8111-1111111111a1';
export const SEED_B_ID = '11111111-1111-4111-8111-1111111111b2';
export const SEED_WALK_ID = '11111111-1111-4111-8111-1111111111c3';

const PLACEHOLDER = 'Placeholder. Confirm weight and reps';

function lift(name, sets, reps, rest) {
  return {
    name,
    sets,
    reps,
    weight: '',
    notes: PLACEHOLDER,
    rest,
    placeholder: true,
  };
}

export const SEED_WORKOUTS = [
  {
    id: SEED_A_ID,
    name: 'Strength A',
    kind: 'strength',
    days: [0, 2, 4],
    pattern: 'alternate-a',
    startTime: '',
    endTime: '',
    sortOrder: 0,
    exercises: [
      lift('Squat', 3, '8', '2 min'),
      lift('Bench', 3, '8', '2 min'),
      lift('Cable row', 3, '10', '90 sec'),
      lift('RDL', 3, '8', '2 min'),
      lift('Plank', 3, '30 sec', '60 sec'),
    ],
  },
  {
    id: SEED_B_ID,
    name: 'Strength B',
    kind: 'strength',
    days: [0, 2, 4],
    pattern: 'alternate-b',
    startTime: '',
    endTime: '',
    sortOrder: 1,
    exercises: [
      lift('RDL', 3, '8', '2 min'),
      lift('DB shoulder press', 3, '8', '90 sec'),
      lift('Lat pulldown', 3, '10', '90 sec'),
      lift('Split squat', 3, '8', '90 sec'),
      lift('Curls', 3, '12', '60 sec'),
      lift('Pushdowns', 3, '12', '60 sec'),
    ],
  },
  {
    id: SEED_WALK_ID,
    name: 'Walk',
    kind: 'walk',
    days: [1, 3, 5],
    pattern: 'weekly',
    startTime: '07:00',
    endTime: '08:00',
    sortOrder: 2,
    exercises: [
      {
        name: 'Walk',
        sets: 1,
        reps: '60 min',
        weight: '',
        notes: '7:00–8:00 AM',
        rest: '',
        placeholder: true,
      },
    ],
  },
];

const DAY_NAMES = {
  mon: 0,
  monday: 0,
  tue: 1,
  tues: 1,
  tuesday: 1,
  wed: 2,
  wednesday: 2,
  thu: 3,
  thur: 3,
  thurs: 3,
  thursday: 3,
  fri: 4,
  friday: 4,
  sat: 5,
  saturday: 5,
  sun: 6,
  sunday: 6,
};

const KINDS = new Set(['strength', 'walk', 'cardio', 'other']);
const PATTERNS = new Set(['weekly', 'alternate-a', 'alternate-b']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value) {
  return UUID_RE.test(String(value || ''));
}

export function parseDays(value) {
  if (value == null || value === '') return { value: [] };
  const list = Array.isArray(value) ? value : String(value).split(/[,/]/);
  const days = [];
  for (const item of list) {
    if (typeof item === 'number' || /^\d+$/.test(String(item).trim())) {
      const n = Number(item);
      if (!Number.isInteger(n) || n < 0 || n > 6) return { error: 'days use 0=Mon through 6=Sun.' };
      days.push(n);
      continue;
    }
    const name = String(item || '').trim().toLowerCase();
    if (!name) continue;
    if (!(name in DAY_NAMES)) return { error: `Unknown day "${item}".` };
    days.push(DAY_NAMES[name]);
  }
  return { value: [...new Set(days)].sort((a, b) => a - b) };
}

function clock(value, label) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (!/^\d{2}:\d{2}$/.test(text)) return { error: `${label} must be HH:MM.` };
  return text;
}

export function normalizeExercise(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { error: 'Each exercise must be an object.' };
  const name = String(raw.name || '').trim();
  if (!name) return { error: 'Each exercise needs a name.' };
  if (name.length > 120) return { error: 'Exercise name is too long.' };
  let sets = null;
  if (raw.sets !== undefined && raw.sets !== null && raw.sets !== '') {
    sets = Number(raw.sets);
    if (!Number.isInteger(sets) || sets < 0 || sets > 100) return { error: 'sets must be a whole number from 0 to 100.' };
  }
  const reps = String(raw.reps ?? '').trim();
  if (reps.length > 40) return { error: 'reps is too long.' };
  const weight = String(raw.weight ?? raw.load ?? '').trim();
  if (weight.length > 80) return { error: 'weight is too long.' };
  const notes = String(raw.notes ?? '').trim();
  if (notes.length > 500) return { error: 'exercise notes are too long.' };
  const rest = String(raw.rest ?? '').trim();
  if (rest.length > 40) return { error: 'rest is too long.' };
  return {
    value: {
      name,
      sets,
      reps,
      weight,
      notes,
      rest,
      placeholder: Boolean(raw.placeholder),
    },
  };
}

function inferKind(name) {
  if (/walk/i.test(name)) return 'walk';
  if (/run|cardio|bike|row|swim/i.test(name)) return 'cardio';
  return 'strength';
}

export function normalizeWorkout(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { error: 'Workout must be an object.' };
  const name = String(raw.name || '').trim();
  if (!name) return { error: 'Workout name is required.' };
  if (name.length > 80) return { error: 'Workout name is too long.' };
  const kind = raw.kind ? String(raw.kind).trim().toLowerCase() : inferKind(name);
  if (!KINDS.has(kind)) return { error: 'kind must be strength, walk, cardio, or other.' };
  const days = parseDays(raw.days ?? raw.day);
  if (days.error) return days;
  const pattern = raw.pattern ? String(raw.pattern) : 'weekly';
  if (!PATTERNS.has(pattern)) return { error: 'pattern must be weekly, alternate-a, or alternate-b.' };
  const startTime = clock(raw.startTime, 'startTime');
  if (startTime?.error) return startTime;
  const endTime = clock(raw.endTime, 'endTime');
  if (endTime?.error) return endTime;
  if (!Array.isArray(raw.exercises || [])) return { error: 'exercises must be a list.' };
  const list = raw.exercises || [];
  if (list.length > 40) return { error: 'A workout can have at most 40 exercises.' };
  const exercises = [];
  for (const item of list) {
    const exercise = normalizeExercise(item);
    if (exercise.error) return exercise;
    exercises.push(exercise.value);
  }
  const sortOrder = Number.isFinite(Number(raw.sortOrder)) ? Number(raw.sortOrder) : 0;
  return {
    value: {
      name,
      kind,
      days: days.value,
      pattern,
      startTime,
      endTime,
      exercises,
      sortOrder,
    },
  };
}

export function cloneSeed() {
  return JSON.parse(JSON.stringify(SEED_WORKOUTS));
}

export function visibleWorkouts(state) {
  if (!state?.adopted) {
    return { source: 'seed', adopted: false, workouts: cloneSeed() };
  }
  const workouts = (state.workouts || [])
    .filter((workout) => workout && !workout.deleted)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || a.name.localeCompare(b.name));
  return { source: 'jeno', adopted: true, workouts };
}

function materialize(state) {
  if (state?.adopted) {
    return { adopted: true, workouts: JSON.parse(JSON.stringify(state.workouts || [])) };
  }
  return { adopted: true, workouts: cloneSeed() };
}

function byId(workouts, id) {
  return workouts.find((workout) => workout.id === id && !workout.deleted) || null;
}

export function workoutMatchesDay(workout, iso) {
  if (!workout || workout.deleted) return false;
  if (workout.pattern === 'alternate-a') return workoutFor(iso).id === 'strength-a';
  if (workout.pattern === 'alternate-b') return workoutFor(iso).id === 'strength-b';
  return (workout.days || []).includes(dow(iso));
}

export function workoutsOnDay(workouts, iso) {
  return (workouts || []).filter((workout) => workoutMatchesDay(workout, iso));
}

export function formatExercise(exercise) {
  const load = [];
  if (exercise?.sets != null && exercise.reps) load.push(`${exercise.sets} × ${exercise.reps}`);
  else if (exercise?.sets != null) load.push(`${exercise.sets} sets`);
  else if (exercise?.reps) load.push(String(exercise.reps));
  if (exercise?.weight) load.push(exercise.weight);
  return load.join(' · ');
}

export function patternLabel(workout) {
  if (workout?.pattern === 'alternate-a' || workout?.pattern === 'alternate-b') return 'Alternates Mon, Wed, Fri';
  return dayLabels(workout?.days) || 'No days set';
}

export function dayLabels(days = []) {
  return [...days]
    .sort((a, b) => a - b)
    .map((day) => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][day])
    .filter(Boolean)
    .join(', ');
}

function activity(action, summary, detail) {
  return { kind: 'workout', action, summary, detail };
}

/**
 * Pure program transition. Ids and timestamps are already set on workouts.
 * Returns `{ error, status }` or `{ state, activity }`.
 */
export function applyProgramAction(state, action) {
  const base = state?.adopted ? { adopted: true, workouts: state.workouts || [] } : { adopted: false, workouts: [] };

  if (action.type === 'create') {
    const next = materialize(base);
    if (byId(next.workouts, action.workout.id)) {
      return { error: 'A workout with that id already exists.', status: 409 };
    }
    next.workouts.push(action.workout);
    next.adopted = true;
    return {
      state: next,
      activity: activity('created', `Added workout ${action.workout.name}`, { id: action.workout.id, name: action.workout.name }),
    };
  }

  if (action.type === 'update') {
    const next = materialize(base);
    const index = next.workouts.findIndex((workout) => workout.id === action.id && !workout.deleted);
    if (index < 0) return { error: 'Workout not found.', status: 404 };
    next.workouts[index] = { ...next.workouts[index], ...action.patch, id: action.id, deleted: false };
    next.adopted = true;
    return {
      state: next,
      activity: activity('updated', `Updated ${next.workouts[index].name}`, { id: action.id, name: next.workouts[index].name }),
    };
  }

  if (action.type === 'delete') {
    const next = materialize(base);
    const index = next.workouts.findIndex((workout) => workout.id === action.id && !workout.deleted);
    if (index < 0) return { error: 'Workout not found.', status: 404 };
    const name = next.workouts[index].name;
    next.workouts[index] = { ...next.workouts[index], deleted: true };
    next.adopted = true;
    return {
      state: next,
      activity: activity('deleted', `Removed ${name}`, { id: action.id, name }),
    };
  }

  if (action.type === 'replace') {
    const previous = base.adopted ? base.workouts : [];
    const incomingIds = new Set(action.workouts.map((workout) => workout.id));
    const tombstones = previous
      .filter((workout) => workout.id && !incomingIds.has(workout.id))
      .map((workout) => ({ ...workout, deleted: true }));
    return {
      state: { adopted: true, workouts: [...tombstones, ...action.workouts] },
      activity: activity('replaced', `Replaced the weekly program · ${action.workouts.length} workouts`, {
        count: action.workouts.length,
        names: action.workouts.map((workout) => workout.name),
      }),
    };
  }

  return { error: 'Unknown program action.', status: 400 };
}
