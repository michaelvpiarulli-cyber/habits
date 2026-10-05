/**
 * Planning home helpers — daily/weekly overview without a second nav map.
 */

import { groupBoardCards } from './boards.js';
import { groupTasks, living } from './life.js';
import { recentNotes } from './notes.js';

/** Open (non-done) board cards, backlog then doing, newest-ish first within column. */
export function openBoardPulse(cards, limit = 4) {
  const grouped = groupBoardCards(cards);
  const open = [];
  for (const col of grouped) {
    if (col.id === 'done') continue;
    for (const card of col.cards) open.push(card);
  }
  return open.slice(0, Math.max(0, limit));
}

/** Next open todos for the planning overview (overdue → today → upcoming → later). */
export function focusTodos(tasks, today, limit = 5) {
  const grouped = groupTasks(tasks, today);
  return [...grouped.overdue, ...grouped.dueToday, ...grouped.upcoming, ...grouped.later].slice(
    0,
    Math.max(0, limit)
  );
}

/** Compact counts for the planning pulse line. */
export function planningPulse({ notes = [], tasks = [], books = [], boardCards = [] } = {}) {
  const openTodos = living(tasks).filter((t) => !t.done).length;
  const reading = living(books).filter((b) => b.status === 'reading' || b.status === 'paused').length;
  const boardOpen = openBoardPulse(boardCards, Infinity).length;
  const pageCount = recentNotes(notes, Infinity).length;
  return {
    pageCount,
    openTodos,
    reading,
    boardOpen,
    summary: [
      `${pageCount} page${pageCount === 1 ? '' : 's'}`,
      openTodos ? `${openTodos} todo${openTodos === 1 ? '' : 's'}` : null,
      reading ? `${reading} reading` : null,
      boardOpen ? `${boardOpen} on board` : null,
    ]
      .filter(Boolean)
      .join(' · '),
  };
}

/** Pages that live in the SideNav map — no nested “More” back bar. */
export const WORKSPACE_PAGES = new Set([
  'notes',
  'boards',
  'tasks',
  'books',
  'habits',
  'goals',
  'progress',
  'creativity',
  'grocery',
  'money',
  'identity',
  'calories',
  'jobs',
  'mail',
]);
