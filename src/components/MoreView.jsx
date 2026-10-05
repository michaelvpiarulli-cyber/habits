import { useMemo } from 'react';
import { useData } from '../context/DataProvider';
import { useLife } from '../context/LifeProvider';
import { todayISO } from '../lib/dates';
import { groupBoardCards } from '../lib/boards';
import { childrenOf, isHit, targetOf, topLevelGoals } from '../lib/goals';
import { lifePulse, noteSnippet, noteTitle, recentNotes } from '../lib/notes';
import { LIFE_SPACES } from '../lib/spaces';
import { isDue } from '../lib/streaks';

const SPACE_DETAILS = {
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

/**
 * Life workspace — Notion’s calm hierarchy: spaces, then pages.
 * Pulse, recent notes, open goals, then Focus / Create / Read / House.
 */
export function MoreView({ onOpen }) {
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
  const previewNotes = recentNotes(notes, 4);
  const openTodos = tasks.filter((t) => !t.done).length;
  const readingCount = books.filter((b) => b.status === 'reading' || b.status === 'paused').length;
  const boardOpen = useMemo(
    () => groupBoardCards(boardCards).filter((c) => c.id !== 'done').reduce((n, c) => n + c.cards.length, 0),
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
          Spaces for focus, create, read, and house — calm pages, not another dashboard.
        </p>
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
          <h2 className="eyebrow">Notes</h2>
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

      <section className="section life-section">
        <div className="section__head">
          <h2 className="eyebrow">Goals in motion</h2>
          <button type="button" className="text-btn" onClick={() => onOpen('more', 'goals')}>
            {openGoals.length ? 'All' : 'New'}
          </button>
        </div>
        {openGoals.length === 0 ? (
          <button type="button" className="life-empty-row" onClick={() => onOpen('more', 'goals')}>
            Set a destination. Micro-steps live underneath.
          </button>
        ) : (
          <ul className="goals goals--compact">
            {openGoals.slice(0, 4).map((g) => {
              const progress = goalProgress(g);
              const target = targetOf(g, goals);
              const pct = Math.min(100, Math.round((progress / target) * 100));
              const micros = childrenOf(goals, g.id);
              const unit = micros.length > 0 && !g.habitId ? 'steps' : g.unit || '';
              return (
                <li key={g.id}>
                  <button
                    type="button"
                    className="goal goal--compact goal--link"
                    onClick={() => onOpen('more', 'goals')}
                  >
                    <header className="goal__head">
                      <div className="goal__copy">
                        <p className="eyebrow">
                          of {target}
                          {unit ? ` ${unit}` : ''}
                        </p>
                        <h3 className="goal__title">{g.title}</h3>
                      </div>
                      <span className="goal__figure">{progress}</span>
                    </header>
                    <div
                      className="goal__bar"
                      role="img"
                      aria-label={`${progress} of ${target}${unit ? ` ${unit}` : ''}`}
                      style={{ '--fill': `${pct}%` }}
                    >
                      <span className="goal__fill" />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {LIFE_SPACES.map((space) => (
        <section key={space.id} className="life-space">
          <header className="life-space__head">
            <h2 className="life-space__title">{space.label}</h2>
            <p className="life-space__blurb">{space.blurb}</p>
          </header>
          <ul className="more-list more-list--dense">
            {space.pages.map((page) => (
              <li key={page.id}>
                <button type="button" className="more-row" onClick={() => onOpen('more', page.id)}>
                  <span className="more-row__copy">
                    <span className="more-row__label">{page.label}</span>
                    <span className="more-row__detail">{SPACE_DETAILS[page.id] || ''}</span>
                  </span>
                  <span aria-hidden="true">›</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
