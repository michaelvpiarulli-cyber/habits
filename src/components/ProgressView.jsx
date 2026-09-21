import { useEffect, useMemo, useRef } from 'react';
import { useData } from '../context/DataProvider';
import { addDays, monthLabel, parseISO, rangeOfDays, todayISO } from '../lib/dates';
import { describeCadence, describeTarget, fractionOf, isTrend } from '../lib/habits';
import { bestStreak, completionRate, countPerfectDays, currentStreak, isDue, isPerfectDay, perfectDayStreak } from '../lib/streaks';
import { nextTreat, TREATS } from '../lib/rewards';
import { TrendChart } from './TrendChart';
import { ReviewList } from './WeeklyReview';
import { childrenOf, isHit, targetOf, topLevelGoals } from '../lib/goals';

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

function TreatsBoard({ closed }) {
  const next = nextTreat(closed);

  return (
    <section className="section">
      <h2 className="eyebrow">Treats</h2>
      <p className="section__note">
        Closed days you keep, even if a streak breaks.
        {next
          ? next.unlock === 'gold'
            ? ` ${next.at - closed} more and you unlock gold.`
            : ` ${next.at - closed} more to ${next.name}.`
          : closed
            ? ' The press is full.'
            : ''}
      </p>
      <ul className="treats">
        {TREATS.map((treat) => {
          const earned = closed >= treat.at;
          const isNext = next?.id === treat.id;
          const gold = treat.unlock === 'gold';
          return (
            <li
              key={treat.id}
              className={`treat ${earned ? 'is-earned' : ''} ${isNext ? 'is-next' : ''} ${gold ? 'treat--gold' : ''}`}
            >
              <span className="treat__mark" aria-hidden="true">
                {earned ? '★' : treat.at}
              </span>
              <span className="treat__name">{treat.name}</span>
              <span className="treat__at">
                {treat.at} closed days{gold ? ' · unlock gold' : ''}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function ProgressView({ onOpen }) {
  const { activeHabits, doneSets, doneSetFor, logFor, valueFor, goals, goalProgress } = useData();
  const today = todayISO();
  const from = addDays(today, -(HISTORY_DAYS - 1));
  const days = useMemo(() => rangeOfDays(from, today), [from, today]);

  const trendHabits = activeHabits.filter(isTrend);
  const perfect = perfectDayStreak(activeHabits, doneSets, today);
  const closed = countPerfectDays(activeHabits, doneSets, today);
  const ranked = [...activeHabits].sort(
    (a, b) => currentStreak(b, doneSetFor(b.id), today) - currentStreak(a, doneSetFor(a.id), today)
  );
  const openGoals = topLevelGoals(goals).filter((g) => !isHit(g, goalProgress(g), goals));

  if (activeHabits.length === 0 && openGoals.length === 0) {
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
        <p className="eyebrow">Keep the chain</p>
        <h1 className="view__title">The record</h1>
      </header>

      <div className="record-hero">
        <div className="figure">
          <span className="figure__number">{closed}</span>
          <span className="eyebrow">closed days</span>
        </div>
        <div className="figure">
          <span className="figure__number">{perfect}</span>
          <span className="eyebrow">in a row</span>
        </div>
      </div>

      <TreatsBoard closed={closed} />

      {openGoals.length > 0 && (
        <section className="section">
          <div className="section__head">
            <h2 className="eyebrow">Goals</h2>
            {onOpen && (
              <button type="button" className="text-btn" onClick={() => onOpen('more', 'goals')}>
                All
              </button>
            )}
          </div>
          <ul className="goals goals--compact">
            {openGoals.map((g) => {
              const progress = goalProgress(g);
              const target = targetOf(g, goals);
              const pct = Math.min(100, Math.round((progress / target) * 100));
              const micros = childrenOf(goals, g.id);
              const unit = micros.length > 0 && !g.habitId ? 'steps' : g.unit || '';
              return (
                <li key={g.id} className="goal goal--compact">
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
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {activeHabits.length > 0 && (
        <section className="section">
          <h2 className="eyebrow">Streaks</h2>
          <ul className="cards">
            {ranked.map((habit) => (
              <StreakCard key={habit.id} habit={habit} doneSet={doneSetFor(habit.id)} today={today} from={from} />
            ))}
          </ul>
        </section>
      )}

      {activeHabits.length > 0 && (
        <section className="section">
          <h2 className="eyebrow">Last 12 weeks</h2>
          <Grid habits={activeHabits} days={days} doneSets={doneSets} logFor={logFor} today={today} />
          <p className="grid__key">
            <span className="key key--part" /> partial
            <span className="key key--full" /> done
            <span className="key key--perfect" /> everything
          </p>
        </section>
      )}

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

      <ReviewList />
    </div>
  );
}
