/**
 * Freeform life notes — Notion-quiet pages, not day_notes.
 *
 * Pure helpers so the editor and dashboard stay thin, and tests do not need a
 * browser. Body is plain text; blank lines are the only "blocks".
 */

import { living } from './life.js';

export const UNTITLED_NOTE = 'Untitled';

export function noteTitle(note) {
  const title = (note?.title || '').trim();
  return title || UNTITLED_NOTE;
}

/** First non-empty line of the body, collapsed for list previews. */
export function noteSnippet(body, max = 96) {
  const text = String(body || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean);
  if (!text) return '';
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

/**
 * Split body into simple blocks (paragraphs). Keeps the editor honest: blank
 * lines are structure; we never invent headings or lists from magic markup.
 */
export function noteBlocks(body) {
  const normalized = String(body || '').replace(/\r\n/g, '\n');
  if (!normalized.trim()) return [];
  return normalized
    .split(/\n{2,}/)
    .map((block) => block.trimEnd())
    .filter((block) => block.length > 0);
}

export function isNoteEmpty(note) {
  return !(note?.title || '').trim() && !(note?.body || '').trim();
}

/**
 * Active (non-archived) notes: pinned first, then most recently touched.
 */
export function sortNotes(notes) {
  return living(notes)
    .filter((note) => !note.archived)
    .sort((a, b) => {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      return String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''));
    });
}

export function recentNotes(notes, limit = 5) {
  return sortNotes(notes).slice(0, Math.max(0, limit));
}

/**
 * Compact pulse for the Life workspace and Record overview — habits, goals,
 * and notes in one glance without becoming an analytics dump.
 */
export function lifePulse({
  habitDone = 0,
  habitDue = 0,
  openGoals = 0,
  hitGoals = 0,
  notesCount = 0,
  dayNote = false,
} = {}) {
  const habitPct = habitDue > 0 ? Math.round((habitDone / habitDue) * 100) : null;
  const lines = [];

  if (habitDue > 0) {
    lines.push(`${habitDone} of ${habitDue} habits today`);
  } else {
    lines.push('No habits due today');
  }

  if (openGoals > 0) lines.push(`${openGoals} goal${openGoals === 1 ? '' : 's'} open`);
  else if (hitGoals > 0) lines.push('All goals reached');
  else lines.push('No goals yet');

  if (notesCount > 0) lines.push(`${notesCount} note${notesCount === 1 ? '' : 's'}`);
  else lines.push('No notes yet');

  if (dayNote) lines.push('Day note started');

  return {
    habitDone,
    habitDue,
    habitPct,
    openGoals,
    hitGoals,
    notesCount,
    dayNote: Boolean(dayNote),
    summary: lines.join(' · '),
    lines,
  };
}
