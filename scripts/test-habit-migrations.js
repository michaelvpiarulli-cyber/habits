import assert from 'node:assert/strict';
import {
  cleanupStarterHabitDuplicates,
  findStarterHabitCounterpart,
  migrateLiftHabitToProgram,
  SEED_TIME,
  STARTER_HABITS,
} from '../src/lib/habits.js';

const CLEANED_AT = '2026-08-01T17:00:00.000Z';

const seed = (index, id = `seed-${index}`) => {
  const starter = STARTER_HABITS[index];
  return {
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
    id,
    sortOrder: index,
    deleted: false,
    createdAt: '2026-07-26T00:00:00.000Z',
    updatedAt: SEED_TIME,
  };
};

const custom = (fields) => ({
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
  sortOrder: 20,
  deleted: false,
  createdAt: '2026-07-26T00:00:00.000Z',
  updatedAt: '2026-07-30T12:00:00.000Z',
  ...fields,
});

{
  const pristine = seed(0);
  const edited = custom({
    id: 'whole-foods-established',
    name: 'Whole foods',
    emoji: '🥬',
    sortOrder: 0,
  });
  assert.equal(findStarterHabitCounterpart(pristine, [edited]), edited);

  const result = cleanupStarterHabitDuplicates([pristine, edited], [], [], CLEANED_AT);
  assert.equal(result.habits.find((habit) => habit.id === pristine.id).deleted, true);
  assert.equal(result.habits.find((habit) => habit.id === edited.id).deleted, false);
  assert.deepEqual([...result.changed.habits], [pristine.id]);
}

{
  const pristine = seed(2);
  const workout = custom({
    id: 'workout-established',
    name: 'Workout',
    emoji: '🏋️',
    kind: 'count',
    target: 1,
    unit: 'lifts',
    sortOrder: 2,
  });
  const follower = custom({
    id: 'follower',
    name: 'Stretch',
    afterId: pristine.id,
  });
  const logs = [
    {
      id: 'old-day',
      habitId: workout.id,
      day: '2026-07-31',
      amount: 1,
      note: 'morning',
      deleted: false,
      updatedAt: '2026-07-31T08:00:00.000Z',
    },
    {
      id: 'seed-same-day',
      habitId: pristine.id,
      day: '2026-07-31',
      amount: 2,
      note: 'evening',
      deleted: false,
      updatedAt: '2026-07-31T18:00:00.000Z',
    },
    {
      id: 'seed-other-day',
      habitId: pristine.id,
      day: '2026-08-01',
      amount: 1,
      note: '',
      deleted: false,
      updatedAt: '2026-08-01T08:00:00.000Z',
    },
    {
      id: 'cleared-canonical-day',
      habitId: workout.id,
      day: '2026-07-30',
      amount: 0,
      note: '',
      deleted: true,
      updatedAt: '2026-07-30T08:00:00.000Z',
    },
    {
      id: 'seed-cleared-day',
      habitId: pristine.id,
      day: '2026-07-30',
      amount: 1,
      note: '',
      deleted: false,
      updatedAt: '2026-07-30T18:00:00.000Z',
    },
  ];
  const goals = [
    {
      id: 'lift-goal',
      habitId: pristine.id,
      deleted: false,
      updatedAt: '2026-07-31T00:00:00.000Z',
    },
  ];

  const result = cleanupStarterHabitDuplicates(
    [pristine, workout, follower],
    logs,
    goals,
    CLEANED_AT
  );

  assert.equal(result.habits.find((habit) => habit.id === pristine.id).deleted, true);
  assert.equal(result.habits.find((habit) => habit.id === follower.id).afterId, workout.id);
  assert.equal(result.goals[0].habitId, workout.id);
  assert.equal(result.logs.find((log) => log.id === 'seed-other-day').habitId, workout.id);
  assert.equal(result.logs.find((log) => log.id === 'seed-same-day').deleted, true);
  assert.equal(result.logs.find((log) => log.id === 'old-day').amount, 2);
  assert.equal(result.logs.find((log) => log.id === 'old-day').note, 'morning\nevening');
  assert.equal(result.logs.find((log) => log.id === 'cleared-canonical-day').deleted, false);
  assert.equal(result.logs.find((log) => log.id === 'cleared-canonical-day').amount, 1);
  assert.equal(result.logs.find((log) => log.id === 'seed-cleared-day').deleted, true);
  assert.deepEqual(
    new Set(result.changed.logs),
    new Set([
      'old-day',
      'seed-same-day',
      'seed-other-day',
      'cleared-canonical-day',
      'seed-cleared-day',
    ])
  );
}

{
  const first = custom({ id: 'custom-one', name: 'Whole foods', emoji: '🥦' });
  const second = custom({ id: 'custom-two', name: 'Whole foods', emoji: '🥬' });
  const habits = [first, second];
  const result = cleanupStarterHabitDuplicates(habits, [], [], CLEANED_AT);

  assert.strictEqual(result.habits, habits);
  assert.equal(result.habits.filter((habit) => !habit.deleted).length, 2);
  assert.equal(result.changed.habits.size, 0);
}

{
  const first = seed(1, 'seed-b');
  const second = seed(1, 'seed-a');
  const logs = [
    {
      id: 'walk-history',
      habitId: first.id,
      day: '2026-08-01',
      amount: 2,
      note: '',
      deleted: false,
      updatedAt: '2026-08-01T08:00:00.000Z',
    },
  ];
  const result = cleanupStarterHabitDuplicates([second, first], logs, [], CLEANED_AT);

  assert.equal(result.habits.find((habit) => habit.id === first.id).deleted, false);
  assert.equal(result.habits.find((habit) => habit.id === second.id).deleted, true);
}

{
  const oldLift = {
    id: STARTER_HABITS[2].id,
    name: 'Lift',
    emoji: '🏋️',
    kind: 'count',
    target: 2,
    unit: 'lifts',
    cadence: 'daily',
    weekdays: [],
    perWeek: 3,
    floor: null,
    cue: '',
    afterId: null,
    archived: false,
    sortOrder: 2,
    deleted: false,
    createdAt: '2026-07-26T00:00:00.000Z',
    updatedAt: SEED_TIME,
  };
  const customized = {
    ...oldLift,
    id: 'custom-lift',
    target: 3,
    unit: 'sets',
    updatedAt: '2026-07-30T12:00:00.000Z',
  };
  const result = migrateLiftHabitToProgram([oldLift, customized], CLEANED_AT);

  assert.deepEqual(result.changedIds, new Set([oldLift.id]));
  assert.equal(result.habits[0].target, 4);
  assert.equal(result.habits[0].unit, 'moves');
  assert.equal(result.habits[0].cadence, 'weekdays');
  assert.deepEqual(result.habits[0].weekdays, [0, 1, 3, 4, 6]);
  assert.equal(result.habits[0].updatedAt, CLEANED_AT);
  assert.equal(result.habits[1].target, 3);
  assert.equal(result.habits[1].cadence, 'daily');
}

{
  const monFri = {
    id: STARTER_HABITS[2].id,
    name: 'Lift',
    kind: 'count',
    target: 4,
    unit: 'moves',
    cadence: 'weekdays',
    weekdays: [0, 1, 2, 3, 4],
    deleted: false,
    updatedAt: SEED_TIME,
  };
  const result = migrateLiftHabitToProgram([monFri], CLEANED_AT);
  assert.deepEqual(result.habits[0].weekdays, [0, 1, 3, 4, 6]);
}

{
  const lift = STARTER_HABITS[2];
  assert.equal(lift.cadence, 'weekdays');
  assert.equal(lift.target, 4);
  assert.equal(lift.unit, 'moves');
  assert.deepEqual(lift.weekdays, [0, 1, 3, 4, 6]);
}

console.log('habit migrations\n\nall tests passed');
