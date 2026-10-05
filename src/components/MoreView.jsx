import { useMemo } from 'react';
import { useData } from '../context/DataProvider';
import { useLife } from '../context/LifeProvider';
import { todayISO } from '../lib/dates';
import { groupBoardCards } from '../lib/boards';
import { isHit, topLevelGoals } from '../lib/goals';
import { lifePulse, noteSnippet, noteTitle, recentNotes } from '../lib/notes';
import { LIFE_SPACES, PAGE_DETAILS, QUICK_CREATES } from '../lib/spaces';
import { isDue } from '../lib/streaks';

/**
 * Life home — a clear dashboard: pulse, quick creates, then space shortcuts.
 * The left Tools sidebar is the full map; this page is the front door.
 */
export function MoreView({ onOpen, onOpenTools }) {
  const { activeHabits, doneSets, goals, goalProgress, noteFor } = useData();
  const { notes, tasks, books, boardCards } = useLife();
  const today = todayISO();

  const dueHabits = useMemo(
    () => activeHabits.filter((h) => isDue(h, today) && h.cadence !== 'per_week'),
    [activeHabits, today]
  );
  const doneHabits = dueHabits.filter((h) => doneSets.get(h.id)?.has(today)).length;
  const parents = topLevelGoals(goals);
  const openGoals = parents.filter((g) => !isHit(g, goalProgress(g), goals));
  const hitGoals = parents.length - openGoals.length;
  const previewNotes = recentNotes(notes, 3);
  const openTodos = tasks.filter((t) => !t.done).length;
  const readingCount = books.filter((b) => b.status === 'reading' || b.status === 'paused').length;
  const boardOpen = useMemo(
    () =>
      groupBoardCards(boardCards)
        .filter((c) => c.id !== 'done')
        .reduce((n, c) => n + c.cards.length, 0),
    [boardCards]
  );
  const pulse = lifePulse({
    habitDone: doneHabits,
    habitDue: dueHabits.length,
    openGoals: openGoals.length,
    hitGoals,
    notesCount: notes.length,
    dayNote: Boolean(noteFor(today)),
  });

  return (
    <div className="view life-home">
      <header className="view__head">
        <p className="eyebrow">Workspace</p>
        <h1 className="view__title">Life</h1>
        <p className="life-home__lede">
          Everything lives in <strong>Tools</strong> on the left — spaces for Focus, Create, Read,
          and House. Use a shortcut below to start something new.
        </p>
        {onOpenTools && (
          <button type="button" className="btn btn--primary life-home__tools-btn" onClick={onOpenTools}>
            Open all tools
          </button>
        )}
      </header>

      <section className="life-pulse" aria-label="Today’s pulse">
        <p className="life-pulse__summary">{pulse.summary}</p>
        {(openTodos > 0 || readingCount > 0 || boardOpen > 0) && (
          <p className="life-pulse__extras">
            {[
              openTodos ? `${openTodos} todo${openTodos === 1 ? '' : 's'}` : null,
              readingCount ? `${readingCount} reading` : null,
              boardOpen ? `${boardOpen} on board` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}
        {pulse.habitDue > 0 && (
          <div
            className="life-pulse__bar"
            role="img"
            aria-label={`${pulse.habitDone} of ${pulse.habitDue} habits done`}
            style={{ '--fill': `${pulse.habitPct || 0}%` }}
          >
            <span className="life-pulse__fill" />
          </div>
        )}
      </section>

      <section className="section life-section">
        <div className="section__head">
          <h2 className="eyebrow">Create</h2>
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
          <h2 className="eyebrow">Spaces</h2>
          {onOpenTools && (
            <button type="button" className="text-btn" onClick={onOpenTools}>
              Sidebar
            </button>
          )}
        </div>
        <ul className="life-space-grid">
          {LIFE_SPACES.map((space) => (
            <li key={space.id}>
              <button
                type="button"
                className="life-space-tile"
                onClick={() => {
                  const first = space.pages[0];
                  if (first) onOpen('more', first.id);
                }}
              >
                <span className="life-space-tile__label">{space.label}</span>
                <span className="life-space-tile__blurb">{space.blurb}</span>
                <span className="life-space-tile__pages">
                  {space.pages.map((p) => p.label).join(' · ')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="section life-section">
        <div className="section__head">
          <h2 className="eyebrow">Recent notes</h2>
          <button type="button" className="text-btn" onClick={() => onOpen('more', 'notes')}>
            {notes.length ? 'All' : 'New'}
          </button>
        </div>
        {previewNotes.length === 0 ? (
          <button type="button" className="life-empty-row" onClick={() => onOpen('more', 'notes')}>
            Start a page — plans, sermons, anything off Today’s loop.
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

      <section className="section life-section life-section--browse">
        <div className="section__head">
          <h2 className="eyebrow">Browse all tools</h2>
        </div>
        {LIFE_SPACES.map((space) => (
          <div key={space.id} className="life-space life-space--compact">
            <header className="life-space__head">
              <h3 className="life-space__title">{space.label}</h3>
            </header>
            <ul className="more-list more-list--dense">
              {space.pages.map((page) => (
                <li key={page.id}>
                  <button
                    type="button"
                    className="more-row"
                    onClick={() => onOpen('more', page.id)}
                  >
                    <span className="more-row__copy">
                      <span className="more-row__label">{page.label}</span>
                      <span className="more-row__detail">{PAGE_DETAILS[page.id] || ''}</span>
                    </span>
                    <span aria-hidden="true">›</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
