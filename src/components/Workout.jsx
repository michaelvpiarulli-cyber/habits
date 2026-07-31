import { useState } from 'react';
import { useData } from '../context/DataProvider';
import { dow } from '../lib/dates';
import { PROGRAM_DISCLAIMER, sessionFor } from '../lib/workouts';

/**
 * Today's session on the daily tab.
 *
 * Which movements are done is not stored anywhere new: the session is worked
 * through in order, so the count already on the Lift habit is the position in
 * the list. Tapping the third movement sets that count to three. One number,
 * already syncing, and no table for something that is only meaningful today.
 *
 * Collapsed to the session name until tapped, because on a Monday you mostly
 * need to know it is push day, not to read twelve sets on the way past.
 */
export function Workout({ day }) {
  const { activeHabits, logFor, setValue } = useData();
  const session = sessionFor(dow(day));

  // The count habit this session drives, if there is one.
  const lift = activeHabits.find((h) => h.kind === 'count' && /lift/i.test(h.name));
  const done = lift ? Number(logFor(lift.id, day)?.amount) || 0 : 0;

  const [open, setOpen] = useState(false);

  const mark = (index) => {
    if (!lift) return;
    // Tapping the movement you just finished sets the count to its position;
    // tapping the last completed one again steps back.
    setValue(lift, day, done === index + 1 ? index : index + 1);
  };

  return (
    <section className={`workout workout--${session.kind}`}>
      <button type="button" className="workout__head" onClick={() => setOpen((o) => !o)}>
        <span>
          <span className="eyebrow">Today’s training</span>
          <span className="workout__name">{session.name}</span>
          <span className="workout__focus">{session.focus}</span>
        </span>
        <span className="workout__toggle" aria-hidden="true">
          {open ? '−' : '+'}
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
          <p className="workout__disclaimer">{PROGRAM_DISCLAIMER}</p>
        </>
      )}
    </section>
  );
}
