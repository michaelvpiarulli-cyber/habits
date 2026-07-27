import { useEffect, useMemo, useRef } from 'react';
import { useData } from '../context/DataProvider';
import { addDays, monthLabel, parseISO, rangeOfDays, todayISO } from '../lib/dates';
import { describeCadence, describeTarget, fractionOf, isTrend } from '../lib/habits';
import { bestStreak, completionRate, currentStreak, isDue, isPerfectDay } from '../lib/streaks';
import { TrendChart } from './TrendChart';

const HISTORY_DAYS = 84; // twelve weeks — enough to see a pattern, few enough to scan

/**
 * The contact sheet: every habit as a row, every day as a column, inked by how
 * much of that day got done.
 *
 * This is the one screen that answers "how am I actually doing" without a
 * single number needing to be read. The bottom row is the payoff — a day where
 * everything landed prints in violet, the colour the two inks only make
 * together, and the only place in the app it appears.
 */
function Grid({ habits, days, doneSets, logFor, today }) {
  const scroller = useRef(null);

  // Open on the present. History reads right-to-left from today, so the useful
  // end of a scrollable strip is the far end.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [days.length]);

  const monthStarts = useMemo(() => {
    const marks = new Map();
    days.forEach((day, i) => {
      if (parseISO(day).getDate() === 1) marks.set(i, monthLabel(day));
    });
    return marks;
  }, [days]);

  return (
    <div className="grid" ref={scroller}>
      <div className="grid__inner" style={{ '--cols': days.length }}>
        <div className="grid__row grid__row--months">
          <span className="grid__gutter" aria-hidden="true" />
          {days.map((day, i) => (
            <span key={day} className="grid__month">
              {monthStarts.get(i) || ''}
            </span>
          ))}
        </div>

        {habits.map((habit) => (
          <div className="grid__row" key={habit.id}>
            <span className="grid__gutter" title={habit.name}>
              {habit.emoji || habit.name.slice(0, 1)}
            </span>
            {days.map((day) => {
              const due = isDue(habit, day);
              const fill = fractionOf(habit, logFor(habit.id, day));
              return (
                <span
                  key={day}
                  className={`cell ${!due ? 'is-off' : ''} ${day === today ? 'is-today' : ''}`}
                  style={{ '--fill': `${Math.round(fill * 100)}%` }}
                  title={`${habit.name} · ${day}`}
                />
              );
            })}
          </div>
        ))}

        <div className="grid__row grid__row--perfect">
          <span className="grid__gutter" title="Every habit done">
            ★
          </span>
          {days.map((day) => (
            <span
              key={day}
              className={`cell cell--perfect ${isPerfectDay(habits, doneSets, day) ? 'is-perfect' : ''}`}
              title={`${day}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function StreakCard({ habit, doneSet, today, from }) {
  const current = currentStreak(habit, doneSet, today);
  const best = bestStreak(habit, doneSet, today);
  const rate = Math.round(completionRate(habit, doneSet, from, today) * 100);
  const unit = habit.cadence === 'per_week' ? 'weeks' : 'days';

  return (
    <li className="card">
      <div className="card__head">
        <h3 className="card__name">
          {habit.emoji && <span aria-hidden="true">{habit.emoji} </span>}
          {habit.name}
        </h3>
        <p className="card__meta">
          {describeCadence(habit)}
          {describeTarget(habit) ? ` · ${describeTarget(habit)}` : ''}
        </p>
      </div>

      <div className="card__figures">
        <div className="figure">
          <span className="figure__number">{current}</span>
          <span className="eyebrow">{unit} running</span>
        </div>
        <div className="figure figure--small">
          <span className="figure__number">{best}</span>
          <span className="eyebrow">best</span>
        </div>
        <div className="figure figure--small">
          <span className="figure__number">
            {rate}
            <i>%</i>
          </span>
          <span className="eyebrow">12 wks</span>
        </div>
      </div>
    </li>
  );
}

export function ProgressView() {
  const { activeHabits, doneSets, doneSetFor, logFor, valueFor } = useData();
  const today = todayISO();
  const from = addDays(today, -(HISTORY_DAYS - 1));
  const days = useMemo(() => rangeOfDays(from, today), [from, today]);

  const trendHabits = activeHabits.filter(isTrend);

  if (activeHabits.length === 0) {
    return (
      <div className="view">
        <header className="view__head">
          <p className="eyebrow">The record</p>
          <h1 className="view__title">Nothing to plot yet</h1>
        </header>
        <div className="empty">
          <p className="empty__body">Add a habit and this fills in a day at a time.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="view">
      <header className="view__head">
        <p className="eyebrow">Last 12 weeks</p>
        <h1 className="view__title">The record</h1>
      </header>

      <Grid habits={activeHabits} days={days} doneSets={doneSets} logFor={logFor} today={today} />
      <p className="grid__key">
        <span className="key key--part" /> partial
        <span className="key key--full" /> done
        <span className="key key--perfect" /> everything
      </p>

      {trendHabits.map((habit) => {
        const points = days
          .map((day) => ({ day, value: valueFor(habit, day) }))
          .filter((p) => p.value > 0);
        return (
          <section className="section" key={habit.id}>
            <h2 className="eyebrow">
              {habit.emoji} {habit.name}
            </h2>
            <TrendChart points={points} target={habit.target} unit={habit.unit} />
          </section>
        );
      })}

      <section className="section">
        <h2 className="eyebrow">Streaks</h2>
        <ul className="cards">
          {activeHabits.map((habit) => (
            <StreakCard key={habit.id} habit={habit} doneSet={doneSetFor(habit.id)} today={today} from={from} />
          ))}
        </ul>
      </section>
    </div>
  );
}
