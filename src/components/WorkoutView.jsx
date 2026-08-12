import { useEffect, useState } from 'react';
import { addDays, formatLong, todayISO } from '../lib/dates';
import { Workout } from './Workout';

/**
 * Workout tab: today’s session and the week ahead, with day paging.
 */
export function WorkoutView() {
  const calendarToday = todayISO();
  const [day, setDay] = useState(calendarToday);

  useEffect(() => {
    setDay((current) => (current > calendarToday ? calendarToday : current));
  }, [calendarToday]);

  const viewingToday = day === calendarToday;
  const canGoForward = day < calendarToday;

  const goPrev = () => setDay((d) => addDays(d, -1));
  const goNext = () => {
    if (!canGoForward) return;
    setDay((d) => addDays(d, 1));
  };

  return (
    <section className="view workout-view">
      <header className="view__head">
        <div className="day-nav">
          <button type="button" className="day-nav__btn" onClick={goPrev} aria-label="Previous day">
            ‹
          </button>
          <div className="day-nav__center">
            <p className="eyebrow">{formatLong(day)}</p>
            {!viewingToday && (
              <button
                type="button"
                className="day-nav__today"
                onClick={() => setDay(calendarToday)}
              >
                Back to today
              </button>
            )}
          </div>
          <button
            type="button"
            className="day-nav__btn"
            onClick={goNext}
            disabled={!canGoForward}
            aria-label="Next day"
          >
            ›
          </button>
        </div>
        <h1 className="view__title">Workout</h1>
      </header>

      <Workout day={day} />
    </section>
  );
}
