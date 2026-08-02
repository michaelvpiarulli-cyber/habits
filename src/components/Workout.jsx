import { useState } from 'react';
import { useData } from '../context/DataProvider';
import { targetOf } from '../lib/habits';
import { dow } from '../lib/dates';
import {
  PROGRAM_DISCLAIMER,
  findLiftHabit,
  findWalkHabit,
  sessionFor,
  sessionProgress,
  weekAhead,
} from '../lib/workouts';

/**
 * Today's session on the daily tab.
 *
 * Which movements are done is not stored anywhere new: the session is worked
 * through in order, so the count already on the Lift habit is the position in
 * the list. Tapping the third movement sets that count to three. One number,
 * already syncing, and no table for something that is only meaningful today.
 *
 * Cardio days (run / walk) still write that 0/1 into the Lift habit so the
 * training record can see them, even though Lift itself is only due Mon–Fri.
 * Finishing a cardio session also nudges Walk after meals once.
 *
 * Collapsed to the session name until tapped, because on a Monday you mostly
 * need to know it is push day, not to read twelve sets on the way past.
 */
export function Workout({ day }) {
  const { activeHabits, logFor, setValue } = useData();
  const session = sessionFor(dow(day));
  const ahead = weekAhead(day);
  const isCardio = session.kind === 'run' || session.kind === 'walk';

  const lift = findLiftHabit(activeHabits);
  const walk = findWalkHabit(activeHabits);
  const logged = lift ? Number(logFor(lift.id, day)?.amount) || 0 : 0;
  const { done, total, complete, fraction } = sessionProgress(session, logged);

  const [open, setOpen] = useState(false);

  const mark = (index) => {
    if (!lift) return;
    const next = done === index + 1 ? index : index + 1;
    setValue(lift, day, next);

    // Cardio completion is a nudge, not a wipe — only bump walk when finishing.
    if (isCardio && walk && next >= total && done < total) {
      const current = Number(logFor(walk.id, day)?.amount) || 0;
      if (current < targetOf(walk)) setValue(walk, day, current + 1);
    }
  };

  const markAll = () => {
    if (!lift || complete) return;
    setValue(lift, day, total);
    if (isCardio && walk) {
      const current = Number(logFor(walk.id, day)?.amount) || 0;
      if (current < targetOf(walk)) setValue(walk, day, current + 1);
    }
  };

  const summary = !lift
    ? session.focus
    : complete
      ? 'Done'
      : done > 0
        ? `${done} of ${total}`
        : session.focus;

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
          <ol className="workout__lifts">
            {session.lifts.map((l, i) => {
              const isDone = i < done;
              return (
                <li key={l.move} className={`lift ${isDone ? 'is-done' : ''}`}>
                  <button
                    type="button"
                    className="lift__body"
                    onClick={() => mark(i)}
                    disabled={!lift}
                    aria-pressed={isDone}
                  >
                    <span className="lift__tick" aria-hidden="true">
                      {isDone ? '✓' : i + 1}
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
