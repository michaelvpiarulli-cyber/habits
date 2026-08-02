import { useEffect, useMemo, useRef } from 'react';
import { useData } from '../context/DataProvider';
import {
  addDays,
  dow,
  rangeOfDays,
  startOfWeek,
  todayISO,
  WEEKDAY_INITIALS,
} from '../lib/dates';
import { findLiftHabit, sessionFor, sessionProgress } from '../lib/workouts';

const HISTORY_DAYS = 84;

/**
 * This week’s prescribed sessions, plus twelve weeks of training ink — the
 * same contact-sheet language as the habit grid, read right-to-left from today.
 */
export function TrainingRecord() {
  const { activeHabits, logFor } = useData();
  const lift = findLiftHabit(activeHabits);
  const today = todayISO();
  const from = addDays(today, -(HISTORY_DAYS - 1));
  const days = useMemo(() => rangeOfDays(from, today), [from, today]);
  const scroller = useRef(null);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [days.length]);

  const week = useMemo(() => {
    const monday = startOfWeek(today);
    return Array.from({ length: 7 }, (_, i) => {
      const day = addDays(monday, i);
      const session = sessionFor(i);
      const amount = lift ? Number(logFor(lift.id, day)?.amount) || 0 : 0;
      return {
        day,
        session,
        progress: sessionProgress(session, amount),
        future: day > today,
      };
    });
  }, [lift, logFor, today]);

  const lifted = week.filter((d) => d.session.kind === 'lift' && !d.future);
  const liftDone = lifted.filter((d) => d.progress.complete).length;
  const cardio = week.filter((d) => d.session.kind !== 'lift' && !d.future);
  const cardioDone = cardio.filter((d) => d.progress.complete).length;

  if (!lift) {
    return (
      <section className="section">
        <h2 className="eyebrow">Training</h2>
        <p className="section__note">
          Add a Lift count habit and this tracks the Mon–Fri program plus the weekend cardio days.
        </p>
      </section>
    );
  }

  return (
    <section className="section">
      <h2 className="eyebrow">Training</h2>
      <p className="training__headline">
        {liftDone} of {lifted.length} lifts
        {cardio.length > 0 ? ` · ${cardioDone}/${cardio.length} cardio` : ''} this week
      </p>

      <ol className="training-week" aria-label="This week’s training">
        {week.map(({ day, session, progress, future }, i) => (
          <li
            key={day}
            className={[
              'training-week__day',
              `training-week__day--${session.kind}`,
              day === today && 'is-today',
              future && 'is-future',
              progress.complete && 'is-done',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span className="training-week__initial">{WEEKDAY_INITIALS[i]}</span>
            <span className="training-week__name">{session.name}</span>
            <span className="training-week__bar" aria-hidden="true">
              <i style={{ width: future ? '0%' : `${Math.round(progress.fraction * 100)}%` }} />
            </span>
            <span className="visually-hidden">
              {day}: {session.name}
              {progress.complete
                ? ', done'
                : progress.done
                  ? `, ${progress.done} of ${progress.total}`
                  : ''}
            </span>
          </li>
        ))}
      </ol>

      <div className="grid training-history" ref={scroller}>
        <div className="grid__inner" style={{ '--cols': days.length }}>
          <div className="grid__row">
            <span className="grid__gutter" title="Training">
              ✦
            </span>
            {days.map((day) => {
              const session = sessionFor(dow(day));
              const amount = Number(logFor(lift.id, day)?.amount) || 0;
              const { fraction, complete } = sessionProgress(session, amount);
              return (
                <span
                  key={day}
                  className={[
                    'cell',
                    `cell--train-${session.kind}`,
                    complete && 'is-train-done',
                    day === today && 'is-today',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{ '--fill': `${Math.round(fraction * 100)}%` }}
                  title={`${session.name} · ${day}`}
                />
              );
            })}
          </div>
        </div>
      </div>
      <p className="grid__key">
        <span className="key key--full" /> lift
        <span className="key key--part" /> partial
        <span className="key key--perfect" /> cardio done
      </p>
    </section>
  );
}
