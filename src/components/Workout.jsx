import { useState } from 'react';
import { useData } from '../context/DataProvider';
import { dow } from '../lib/dates';
import { PROGRAM_DISCLAIMER, sessionFor, weekAhead } from '../lib/workouts';

/**
 * Today's session on the daily tab.
 *
 * Which movements are done is not stored anywhere new: the session is worked
 * through in order, so the count already on the Lift habit is the position in
 * the list. Tapping the third movement sets that count to three. One number,
 * already syncing, and no table for something that is only meaningful today.
 *
 * Opens with the lift list visible so checking off each movement is the main
 * job of the card, not something buried behind a +.
 */
export function Workout({ day }) {
  const { activeHabits, logFor, setValue } = useData();
  const session = sessionFor(dow(day));
  const ahead = weekAhead(day);
  const total = session.lifts.length;

  // The count habit this session drives, if there is one.
  const lift = activeHabits.find((h) => h.kind === 'count' && /lift/i.test(h.name));
  const done = lift ? Number(logFor(lift.id, day)?.amount) || 0 : 0;
  const complete = total > 0 && done >= total;
  const fraction = total ? Math.min(1, done / total) : 0;

  const [open, setOpen] = useState(() => !complete);

  const mark = (index) => {
    if (!lift) return;
    // Tap an unfinished lift to check through it; tap the last checked one to undo.
    setValue(lift, day, done === index + 1 ? index : index + 1);
  };

  const markAll = () => {
    if (!lift || complete) return;
    setValue(lift, day, total);
  };

  const summary = !lift
    ? session.focus
    : complete
      ? 'Session done'
      : done > 0
        ? `${done} of ${total} done`
        : `Tap each lift when you finish · ${total} moves`;

  return (
    <section className={`workout workout--${session.kind} ${complete ? 'is-complete' : ''}`}>
      <button
        type="button"
        className="workout__head"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span>
          <span className="eyebrow">Today’s training</span>
          <span className="workout__name">{session.name}</span>
          <span className="workout__focus">{summary}</span>
        </span>
        <span className="workout__meta" aria-hidden="true">
          {lift && total > 0 && (
            <span className="workout__fill" style={{ '--fill': `${Math.round(fraction * 100)}%` }} />
          )}
          <span className="workout__toggle">{open ? '−' : '+'}</span>
        </span>
      </button>

      {open && (
        <>
          {lift ? (
            <p className="workout__hint">Tap the box when you finish a lift.</p>
          ) : (
            <p className="workout__hint">Add a Lift habit to check moves off.</p>
          )}

          <ol className="workout__lifts">
            {session.lifts.map((l, i) => {
              const isDone = i < done;
              const label = isDone ? `Mark ${l.move} not done` : `Mark ${l.move} done`;
              return (
                <li key={l.move} className={`lift ${isDone ? 'is-done' : ''}`}>
                  <button
                    type="button"
                    className="lift__body"
                    onClick={() => mark(i)}
                    disabled={!lift}
                    aria-pressed={isDone}
                    aria-label={label}
                  >
                    <span className={`lift__check ${isDone ? 'is-on' : ''}`} aria-hidden="true">
                      {isDone ? '✓' : ''}
                    </span>
                    <span className="lift__detail">
                      <span className="lift__move">{l.move}</span>
                      <span className="lift__sets">
                        {l.sets}
                        {l.load ? ` · ${l.load}` : ''}
                      </span>
                      {l.note && <span className="lift__hint">{l.note}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          {lift && !complete && (
            <div className="workout__actions">
              <button type="button" className="btn" onClick={markAll}>
                Mark session done
              </button>
            </div>
          )}

          <p className="workout__disclaimer">{PROGRAM_DISCLAIMER}</p>
        </>
      )}

      <div className="workout__ahead">
        <p className="eyebrow">{ahead.label}</p>
        <ol className="workout__ahead-list" aria-label={ahead.label}>
          {ahead.days.map(({ day: d, weekday, session: s }) => (
            <li key={d} className={`workout__ahead-day workout__ahead-day--${s.kind}`}>
              <span className="workout__ahead-when">{weekday}</span>
              <span className="workout__ahead-what">
                <span className="workout__ahead-name">{s.name}</span>
                <span className="workout__ahead-focus">{s.focus}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
