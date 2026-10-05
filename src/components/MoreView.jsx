import { useMemo } from 'react';
import { useLife } from '../context/LifeProvider';
import { relativeDay, todayISO } from '../lib/dates';
import { BOARD_COLUMNS } from '../lib/boards';
import { noteSnippet, noteTitle, recentNotes } from '../lib/notes';
import { focusTodos, openBoardPulse, planningPulse } from '../lib/planning';
import { QUICK_CREATES } from '../lib/spaces';

const COLUMN_LABEL = Object.fromEntries(BOARD_COLUMNS);

/**
 * Planning home — daily/weekly overview for pages, boards, and todos.
 * SideNav is the map; this is the desk, not a second directory.
 */
export function MoreView({ onOpen }) {
  const { notes, tasks, books, boardCards } = useLife();
  const today = todayISO();
  const pulse = useMemo(
    () => planningPulse({ notes, tasks, books, boardCards }),
    [notes, tasks, books, boardCards]
  );
  const todos = useMemo(() => focusTodos(tasks, today, 5), [tasks, today]);
  const boardRows = useMemo(() => openBoardPulse(boardCards, 4), [boardCards]);
  const previewNotes = useMemo(() => recentNotes(notes, 4), [notes]);

  return (
    <div className="view life-home planning-home">
      <header className="view__head">
        <h1 className="view__title">Planning</h1>
        <p className="life-home__lede">{pulse.summary}</p>
      </header>

      <section className="section life-section">
        <div className="section__head">
          <h2 className="section-label">Focus</h2>
          <button type="button" className="text-btn" onClick={() => onOpen('more', 'tasks')}>
            {pulse.openTodos ? 'All todos' : 'New todo'}
          </button>
        </div>
        {todos.length === 0 ? (
          <button
            type="button"
            className="life-empty-row"
            onClick={() => onOpen('more', 'tasks', { create: true })}
          >
            Nothing waiting — add a todo with a due date.
          </button>
        ) : (
          <ul className="plan-focus-list" aria-label="Open todos">
            {todos.map((task) => {
              const overdue = task.dueDate && task.dueDate < today;
              return (
                <li key={task.id}>
                  <button
                    type="button"
                    className={`plan-focus-row ${overdue ? 'is-overdue' : ''}`}
                    onClick={() => onOpen('more', 'tasks', { taskId: task.id })}
                  >
                    <span className="plan-focus-row__title">{task.title}</span>
                    <span className="plan-focus-row__meta">
                      {task.dueDate
                        ? `${overdue ? 'Due ' : ''}${relativeDay(task.dueDate)}`
                        : 'No date'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="section life-section">
        <div className="section__head">
          <h2 className="section-label">Board</h2>
          <button type="button" className="text-btn" onClick={() => onOpen('more', 'boards')}>
            {pulse.boardOpen ? 'Open board' : 'New row'}
          </button>
        </div>
        {boardRows.length === 0 ? (
          <button
            type="button"
            className="life-empty-row"
            onClick={() => onOpen('more', 'boards', { create: true })}
          >
            Add a board row — status, due date, optional image.
          </button>
        ) : (
          <ul className="plan-focus-list" aria-label="Open board rows">
            {boardRows.map((card) => (
              <li key={card.id}>
                <button
                  type="button"
                  className="plan-focus-row"
                  onClick={() => onOpen('more', 'boards', { cardId: card.id })}
                >
                  <span className="plan-focus-row__title">{card.title}</span>
                  <span className="plan-focus-row__meta">
                    {COLUMN_LABEL[card.column] || card.column}
                    {card.dueDate ? ` · ${relativeDay(card.dueDate)}` : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="section life-section">
        <div className="section__head">
          <h2 className="section-label">Pages</h2>
          <button type="button" className="text-btn" onClick={() => onOpen('more', 'notes')}>
            {notes.length ? 'All pages' : 'New page'}
          </button>
        </div>
        {previewNotes.length === 0 ? (
          <button
            type="button"
            className="life-empty-row"
            onClick={() => onOpen('more', 'notes', { create: true })}
          >
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

      <section className="section life-section">
        <div className="section__head">
          <h2 className="section-label">New</h2>
        </div>
        <ul className="life-quick life-quick--row">
          {QUICK_CREATES.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="life-quick__card"
                onClick={() => onOpen('more', item.id, item.create ? { create: true } : null)}
              >
                <span className="life-quick__label">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
