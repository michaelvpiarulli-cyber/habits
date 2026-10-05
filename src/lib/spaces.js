/**
 * Life workspace — spaces group tools. The left sidebar is the map.
 */

export const CORE_NAV = [
  { id: 'today', kind: 'tab', label: 'Today', detail: 'Daily habit loop' },
  { id: 'record', kind: 'tab', label: 'Record', detail: 'Streaks and progress' },
  { id: 'calendar', kind: 'tab', label: 'Plan', detail: 'Calendar and schedule' },
];

export const PAGE_DETAILS = {
  habits: 'Daily set and streaks',
  goals: 'Destinations and steps',
  tasks: 'Inbox with due dates',
  creativity: 'Sparks and quiet rooms',
  boards: 'Backlog · Doing · Done',
  notes: 'Pages and day reflections',
  books: 'Reading · want · finished',
  grocery: 'What is in stock',
  money: 'Accounts and spend',
  identity: 'Who you are becoming',
  calories: 'Meals and macros',
  jobs: 'Applications',
  mail: 'Gmail inbox',
};

export const LIFE_SPACES = [
  {
    id: 'focus',
    label: 'Focus',
    blurb: 'Habits, goals, and todos with due dates.',
    pages: [
      { id: 'habits', label: 'Habits' },
      { id: 'goals', label: 'Goals' },
      { id: 'tasks', label: 'Todos' },
    ],
  },
  {
    id: 'create',
    label: 'Create',
    blurb: 'Ideas, boards, and drafts.',
    pages: [
      { id: 'creativity', label: 'Creativity' },
      { id: 'boards', label: 'Boards' },
      { id: 'notes', label: 'Notes' },
    ],
  },
  {
    id: 'read',
    label: 'Read',
    blurb: 'Want to read, reading, and finished.',
    pages: [{ id: 'books', label: 'Books' }],
  },
  {
    id: 'house',
    label: 'House',
    blurb: 'Fridge, money, identity, and the rest.',
    pages: [
      { id: 'grocery', label: 'Fridge' },
      { id: 'money', label: 'Money' },
      { id: 'identity', label: 'Identity' },
      { id: 'calories', label: 'Calories' },
      { id: 'jobs', label: 'Jobs' },
      { id: 'mail', label: 'Mail' },
    ],
  },
];

/** Quick-create shortcuts shown on the Life home dashboard. */
export const QUICK_CREATES = [
  { id: 'tasks', label: 'Todo', detail: 'With a due date', space: 'Focus' },
  { id: 'notes', label: 'Note', detail: 'A blank page', space: 'Create' },
  { id: 'boards', label: 'Board card', detail: 'Backlog → Doing → Done', space: 'Create' },
  { id: 'creativity', label: 'Spark', detail: 'Catch an idea', space: 'Create' },
  { id: 'books', label: 'Book', detail: 'Cover + shelf', space: 'Read' },
  { id: 'habits', label: 'Habit', detail: 'Edit the daily set', space: 'Focus' },
];

export function spaceForPage(pageId) {
  return LIFE_SPACES.find((space) => space.pages.some((p) => p.id === pageId)) || null;
}
