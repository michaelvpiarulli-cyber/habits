/**
 * Tally navigation — Habits dashboard + Notion-style planning pages.
 * Secondary tools stay reachable but out of the way.
 */

export const CORE_NAV = [
  { id: 'today', kind: 'tab', label: 'Habits', detail: 'Daily dashboard' },
];

/** Primary planning surfaces — pages, boards/tables, calendar. */
export const PLANNING_NAV = [
  { id: 'planning', kind: 'tab', label: 'Planning', detail: 'Pages and boards' },
  { id: 'notes', kind: 'page', label: 'Pages', detail: 'Docs with images' },
  { id: 'boards', kind: 'page', label: 'Boards', detail: 'Tables and columns' },
  { id: 'tasks', kind: 'page', label: 'Todos', detail: 'Due dates' },
  { id: 'books', kind: 'page', label: 'Books', detail: 'Covers and shelves' },
  { id: 'calendar', kind: 'tab', label: 'Calendar', detail: 'Month view' },
];

export const PAGE_DETAILS = {
  habits: 'Edit the daily set',
  goals: 'Destinations and steps',
  progress: 'Streaks and history',
  tasks: 'Inbox with due dates',
  creativity: 'Sparks and quiet rooms',
  boards: 'Table or board columns',
  notes: 'Pages with covers',
  books: 'Reading · want · finished',
  grocery: 'What is in stock',
  money: 'Accounts and spend',
  identity: 'Who you are becoming',
  calories: 'Meals and macros',
  jobs: 'Applications',
  mail: 'Gmail inbox',
};

/** Kept for LifeProvider / older call sites that iterate spaces. */
export const LIFE_SPACES = [
  {
    id: 'planning',
    label: 'Planning',
    blurb: 'Pages, boards, todos, and books.',
    pages: [
      { id: 'notes', label: 'Pages' },
      { id: 'boards', label: 'Boards' },
      { id: 'tasks', label: 'Todos' },
      { id: 'books', label: 'Books' },
    ],
  },
  {
    id: 'habits-tools',
    label: 'Habits',
    blurb: 'Edit habits and longer goals.',
    pages: [
      { id: 'habits', label: 'Edit habits' },
      { id: 'goals', label: 'Goals' },
      { id: 'progress', label: 'Progress' },
    ],
  },
  {
    id: 'more-tools',
    label: 'More',
    blurb: 'Extras when you need them.',
    pages: [
      { id: 'creativity', label: 'Creativity' },
      { id: 'grocery', label: 'Fridge' },
      { id: 'money', label: 'Money' },
      { id: 'identity', label: 'Identity' },
      { id: 'calories', label: 'Calories' },
      { id: 'jobs', label: 'Jobs' },
      { id: 'mail', label: 'Mail' },
    ],
  },
];

/** Quick creates on the Planning home. */
export const QUICK_CREATES = [
  { id: 'notes', label: 'Page', detail: 'Blank doc', space: 'Planning' },
  { id: 'boards', label: 'Board card', detail: 'Backlog → Done', space: 'Planning' },
  { id: 'tasks', label: 'Todo', detail: 'With a due date', space: 'Planning' },
  { id: 'books', label: 'Book', detail: 'Cover + shelf', space: 'Planning' },
];

export function spaceForPage(pageId) {
  return LIFE_SPACES.find((space) => space.pages.some((p) => p.id === pageId)) || null;
}
