import { useEffect, useState } from 'react';
import { useData } from '../context/DataProvider';
import { addDays, dow, formatLong, todayISO } from '../lib/dates';
import { findTrainingHabit } from '../lib/habits';
import {
  loadSessionPicks,
  saveSessionPick,
  SESSION_OPTIONS,
  sessionById,
  sessionIdFor,
} from '../lib/workouts';
import { Workout } from './Workout';

export function WorkoutView() {
  const { activeHabits, logFor } = useData();
  const calendarToday = todayISO();
  const [day, setDay] = useState(calendarToday);
  const [picks, setPicks] = useState(loadSessionPicks);

  useEffect(() => {
    setDay((current) => (current > calendarToday ? calendarToday : current));
  }, [calendarToday]);

  const viewingToday = day === calendarToday;
  const canGoForward = day < calendarToday;
  const selectedId = picks[day] || sessionIdFor(dow(day));
  const session = sessionById(selectedId);
  const lift = findTrainingHabit(activeHabits);
  const done = lift ? Number(logFor(lift.id, day)?.amount) || 0 : 0;
  const total = session.lifts.length;
  const complete = total > 0 && done >= total;

  const choose = (id) => {
    setPicks(saveSessionPick(day, id));
  };

  return (
    <div className="view">
      <header className="view__head">
        <div className="day-nav">
          <button
            type="button"
            className="day-nav__btn"
            onClick={() => setDay((d) => addDays(d, -1))}
            aria-label="Previous day"
          >
            ‹
          </button>
          <div className="day-nav__center">
            <p className="eyebrow">{formatLong(day)}</p>
            {!viewingToday && (
              <button type="button" className="day-nav__today" onClick={() => setDay(calendarToday)}>
                Back to today
              </button>
            )}
          </div>
          <button
            type="button"
            className="day-nav__btn"
            onClick={() => {
              if (canGoForward) setDay((d) => addDays(d, 1));
            }}
            disabled={!canGoForward}
            aria-label="Next day"
          >
            ›
          </button>
        </div>
        <h1 className="view__title">{session.name}</h1>
        <p className="home__lede">
          {complete ? 'Session done' : done > 0 ? `${done} of ${total} done` : session.focus}
        </p>
      </header>

      <div className="session-picks" role="group" aria-label="Choose today’s session">
        {SESSION_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`session-pick ${option.id === selectedId ? 'is-on' : ''}`}
            aria-pressed={option.id === selectedId}
            onClick={() => choose(option.id)}
          >
            <span className="session-pick__name">{option.label}</span>
            <span className="session-pick__detail">{option.detail}</span>
          </button>
        ))}
      </div>

      <Workout day={day} layout="page" session={session} picks={picks} />
    </div>
  );
}
