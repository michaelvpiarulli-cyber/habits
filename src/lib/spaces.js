/**
 * Life workspace spaces — Notion-quiet areas, not another nav bar.
 */

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
    blurb: 'A quiet room for ideas, boards, and drafts.',
    pages: [
      { id: 'creativity', label: 'Creativity' },
      { id: 'boards', label: 'Boards' },
      { id: 'notes', label: 'Notes' },
    ],
  },
  {
    id: 'read',
    label: 'Read',
    blurb: 'Shelves for reading, want-to-read, and finished.',
    pages: [{ id: 'books', label: 'Books' }],
  },
  {
    id: 'house',
    label: 'House',
    blurb: 'The rest of life — fridge, money, identity.',
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
