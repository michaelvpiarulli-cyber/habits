/**
 * Life notes + pulse helpers — run with `npm test`.
 */
import assert from 'node:assert/strict';
import {
  isNoteEmpty,
  lifePulse,
  noteBlocks,
  noteSnippet,
  noteTitle,
  recentNotes,
  sortNotes,
  UNTITLED_NOTE,
} from '../src/lib/notes.js';

let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`  FAIL  ${name}`);
    console.error(`        ${err.message}`);
  }
}

console.log('notes');

const stamp = (id, extra = {}) => ({
  id,
  title: '',
  body: '',
  pinned: false,
  archived: false,
  deleted: false,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  ...extra,
});

test('noteTitle falls back to Untitled', () => {
  assert.equal(noteTitle({ title: '  ' }), UNTITLED_NOTE);
  assert.equal(noteTitle({ title: 'Trip' }), 'Trip');
});

test('noteSnippet takes the first non-empty line and truncates', () => {
  assert.equal(noteSnippet('\n\n  Hello world  \nMore'), 'Hello world');
  assert.equal(noteSnippet('x'.repeat(120), 20).endsWith('…'), true);
  assert.equal(noteSnippet(''), '');
});

test('noteBlocks splits on blank lines', () => {
  assert.deepEqual(noteBlocks('One\n\nTwo\nlines\n\n\nThree'), ['One', 'Two\nlines', 'Three']);
  assert.deepEqual(noteBlocks('   '), []);
});

test('isNoteEmpty requires title, body, and cover blank', () => {
  assert.equal(isNoteEmpty({ title: '', body: '' }), true);
  assert.equal(isNoteEmpty({ title: 'A', body: '' }), false);
  assert.equal(isNoteEmpty({ title: '', body: 'B' }), false);
  assert.equal(isNoteEmpty({ title: '', body: '', coverUrl: 'data:image/jpeg;base64,x' }), false);
});

test('sortNotes pins first then newest updatedAt', () => {
  const sorted = sortNotes([
    stamp('a', { title: 'Old', updatedAt: '2026-08-01T00:00:00.000Z' }),
    stamp('b', { title: 'Pinned', pinned: true, updatedAt: '2026-08-01T00:00:00.000Z' }),
    stamp('c', { title: 'New', updatedAt: '2026-08-10T00:00:00.000Z' }),
    stamp('d', { title: 'Gone', deleted: true }),
    stamp('e', { title: 'Archive', archived: true }),
  ]);
  assert.deepEqual(
    sorted.map((n) => n.id),
    ['b', 'c', 'a']
  );
});

test('recentNotes respects limit after sort', () => {
  const notes = [
    stamp('a', { updatedAt: '2026-08-01T00:00:00.000Z' }),
    stamp('b', { updatedAt: '2026-08-03T00:00:00.000Z' }),
    stamp('c', { updatedAt: '2026-08-02T00:00:00.000Z' }),
  ];
  assert.deepEqual(
    recentNotes(notes, 2).map((n) => n.id),
    ['b', 'c']
  );
});

test('lifePulse summarizes habits, goals, and notes', () => {
  const pulse = lifePulse({
    habitDone: 2,
    habitDue: 4,
    openGoals: 3,
    hitGoals: 1,
    notesCount: 5,
    dayNote: true,
  });
  assert.equal(pulse.habitPct, 50);
  assert.match(pulse.summary, /2 of 4 habits today/);
  assert.match(pulse.summary, /3 goals open/);
  assert.match(pulse.summary, /5 notes/);
  assert.equal(pulse.lines.includes('Day note started'), true);
});

test('lifePulse handles empty life gracefully', () => {
  const pulse = lifePulse();
  assert.equal(pulse.habitPct, null);
  assert.match(pulse.summary, /No habits due today/);
  assert.match(pulse.summary, /No goals yet/);
  assert.match(pulse.summary, /No notes yet/);
});

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log('notes: all good\n');
