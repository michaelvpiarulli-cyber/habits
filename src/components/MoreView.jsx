import { useMemo } from 'react';
import { useData } from '../context/DataProvider';
import { useLife } from '../context/LifeProvider';
import { todayISO } from '../lib/dates';
import { childrenOf, isHit, targetOf, topLevelGoals } from '../lib/goals';
import { lifePulse, noteSnippet, noteTitle, recentNotes } from '../lib/notes';
import { isDue } from '../lib/streaks';

const GROUPS = [
  {
    label: 'Daily',
    pages: [
      { id: 'notes', label: 'Notes', detail: 'Pages and day reflections' },
      { id: 'goals', label: 'Goals', detail: 'Destinations and steps' },
      { id: 'habits', label: 'Habits', detail: 'Edit the daily set' },
      { id: 'calories', label: 'Calories', detail: 'Meals and macros' },
    ],
  },
  {
    label: 'Work',
    pages: [
      { id: 'tasks', label: 'Tasks', detail: 'Inbox and due dates' },
      { id: 'jobs', label: 'Jobs', detail: 'Applications' },
      { id: 'mail', label: 'Mail', detail: 'Gmail inbox' },
    ],
  },
  {
    label: 'Life',
    pages: [
      { id: 'books', label: 'Books', detail: 'Currently reading' },
      { id: 'grocery', label: 'Fridge', detail: 'What is in stock' },
      { id: 'money', label: 'Money', detail: 'Accounts and spend' },
      { id: 'identity', label: 'Identity', detail: 'Who you are becoming' },
    ],
  },
];

/**
 * Life workspace — Notion’s calm hierarchy without the gray sludge.
 * One pulse, recent notes, open goals, then a dense page list.
 */
export function MoreView({ onOpen }) {
  const { activeHabits, doneSets, goals, goalProgress, noteFor } = useData();
  const { notes } = useLife();
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
          Notes, goals, and the rest of the house — calm pages, not another dashboard.
        </p>
      </header>

      <section className="life-pulse" aria-label="Today’s pulse">
        <p className="life-pulse__summary">{pulse.summary}</p>
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

      {GROUPS.map((group) => (
        <section key={group.label} className="more-group">
          <h2 className="eyebrow">{group.label}</h2>
          <ul className="more-list more-list--dense">
            {group.pages.map((page) => (
              <li key={page.id}>
                <button type="button" className="more-row" onClick={() => onOpen('more', page.id)}>
                  <span className="more-row__copy">
                    <span className="more-row__label">{page.label}</span>
                    <span className="more-row__detail">{page.detail}</span>
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
