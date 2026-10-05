import { useMemo } from 'react';
import { useLife } from '../context/LifeProvider';
import { groupBoardCards } from '../lib/boards';
import { noteSnippet, noteTitle, recentNotes } from '../lib/notes';
import { QUICK_CREATES } from '../lib/spaces';

/**
 * Planning home — Notion-quiet front door for pages, boards, and books.
 * Habits live on their own dashboard; extras stay in the sidebar under More.
 */
export function MoreView({ onOpen, onOpenTools }) {
  const { notes, tasks, books, boardCards } = useLife();
  const previewNotes = recentNotes(notes, 4);
  const openTodos = tasks.filter((t) => !t.done).length;
  const readingCount = books.filter((b) => b.status === 'reading' || b.status === 'paused').length;
  const boardOpen = useMemo(
    () =>
      groupBoardCards(boardCards)
        .filter((c) => c.id !== 'done')
        .reduce((n, c) => n + c.cards.length, 0),
    [boardCards]
  );

  return (
    <div className="view life-home planning-home">
      <header className="view__head">
        <p className="eyebrow">Workspace</p>
        <h1 className="view__title">Planning</h1>
        <p className="life-home__lede">
          Pages, boards, and books — a calm place to plan. Habits stay on the Habits dashboard.
        </p>
      </header>

      <section className="life-pulse" aria-label="Planning pulse">
        <p className="life-pulse__summary">
          {[
            `${notes.length} page${notes.length === 1 ? '' : 's'}`,
            openTodos ? `${openTodos} todo${openTodos === 1 ? '' : 's'}` : null,
            readingCount ? `${readingCount} reading` : null,
            boardOpen ? `${boardOpen} on board` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </section>

      <section className="section life-section">
        <div className="section__head">
          <h2 className="eyebrow">New</h2>
        </div>
        <ul className="life-quick">
          {QUICK_CREATES.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="life-quick__card"
                onClick={() => onOpen('more', item.id)}
              >
                <span className="life-quick__space">{item.space}</span>
                <span className="life-quick__label">{item.label}</span>
                <span className="life-quick__detail">{item.detail}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="section life-section">
        <div className="section__head">
          <h2 className="eyebrow">Surfaces</h2>
          {onOpenTools && (
            <button type="button" className="text-btn" onClick={onOpenTools}>
              Sidebar
            </button>
          )}
        </div>
        <ul className="planning-surfaces">
          <li>
            <button type="button" className="planning-surface" onClick={() => onOpen('more', 'notes')}>
              <span className="planning-surface__label">Pages</span>
              <span className="planning-surface__detail">Docs, notes, images</span>
            </button>
          </li>
          <li>
            <button type="button" className="planning-surface" onClick={() => onOpen('more', 'boards')}>
              <span className="planning-surface__label">Boards</span>
              <span className="planning-surface__detail">Table columns · backlog to done</span>
            </button>
          </li>
          <li>
            <button type="button" className="planning-surface" onClick={() => onOpen('more', 'tasks')}>
              <span className="planning-surface__label">Todos</span>
              <span className="planning-surface__detail">Inbox with due dates</span>
            </button>
          </li>
          <li>
            <button type="button" className="planning-surface" onClick={() => onOpen('more', 'books')}>
              <span className="planning-surface__label">Books</span>
              <span className="planning-surface__detail">Covers and shelves</span>
            </button>
          </li>
          <li>
            <button type="button" className="planning-surface" onClick={() => onOpen('calendar')}>
              <span className="planning-surface__label">Calendar</span>
              <span className="planning-surface__detail">Month view</span>
            </button>
          </li>
        </ul>
      </section>

      <section className="section life-section">
        <div className="section__head">
          <h2 className="eyebrow">Recent pages</h2>
          <button type="button" className="text-btn" onClick={() => onOpen('more', 'notes')}>
            {notes.length ? 'All' : 'New'}
          </button>
        </div>
        {previewNotes.length === 0 ? (
          <button type="button" className="life-empty-row" onClick={() => onOpen('more', 'notes')}>
            Start a page — plans, lists, anything beyond the habit loop.
          </button>
        ) : (
          <ul className="page-list">
            {previewNotes.map((note) => (
              <li key={note.id}>
                <button
                  type="button"
                  className="page-row"
                  onClick={() => onOpen('more', 'notes', { noteId: note.id })}
                >
                  <span className="page-row__mark" aria-hidden="true">
                    {note.pinned ? '◆' : '○'}
                  </span>
                  <span className="page-row__copy">
                    <span className="page-row__title">{noteTitle(note)}</span>
                    {noteSnippet(note.body) && (
                      <span className="page-row__meta">{noteSnippet(note.body)}</span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
