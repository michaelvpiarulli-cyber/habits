/**
 * Kanban boards for the Life workspace — three calm columns, optional due dates.
 */

import { living } from './life.js';

export const BOARD_COLUMNS = [
  ['backlog', 'Backlog'],
  ['doing', 'Doing'],
  ['done', 'Done'],
];

const COLUMN_IDS = new Set(BOARD_COLUMNS.map(([id]) => id));

export function normalizeBoardColumn(column) {
  return COLUMN_IDS.has(column) ? column : 'backlog';
}

export function groupBoardCards(cards) {
  const active = living(cards);
  const byColumn = Object.fromEntries(BOARD_COLUMNS.map(([id]) => [id, []]));
  for (const card of active) {
    byColumn[normalizeBoardColumn(card.column)].push(card);
  }
  const bySort = (a, b) => {
    const sort = (a.sortOrder || 0) - (b.sortOrder || 0);
    if (sort) return sort;
    return String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
  };
  return BOARD_COLUMNS.map(([id, label]) => ({
    id,
    label,
    cards: byColumn[id].sort(bySort),
  }));
}

export function nextBoardSortOrder(cards, column) {
  const col = normalizeBoardColumn(column);
  let max = -1;
  for (const card of living(cards)) {
    if (normalizeBoardColumn(card.column) !== col) continue;
    max = Math.max(max, Number(card.sortOrder) || 0);
  }
  return max + 1;
}
