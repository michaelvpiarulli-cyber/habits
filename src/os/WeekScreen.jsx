import { useCallback, useEffect, useMemo, useState } from 'react';
import { useData } from '../context/DataProvider';
import { useLife } from '../context/LifeProvider';
import { WEEKDAY_INITIALS, WEEKDAY_LABELS, addDays, startOfWeek, todayISO } from '../lib/dates';
import { formatStepCount } from '../lib/steps';
import { currentStreak } from '../lib/streaks';
import {
  habitWeekCount,
  readWeekStart,
  searchForWeek,
  tasksCompletedInWeek,
  weekDays,
  weekFood,
  weekLabel,
  weekSteps,
  weekWorkouts,
} from '../lib/weekReview';
import { HabitMark } from './HabitMark';
import { useProgram } from './hooks';

function Chevron({ dir }) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {dir === 'left' ? <path d="M10 3.5 5.5 8 10 12.5" /> : <path d="M6 3.5 10.5 8 6 12.5" />}
    </svg>
  );
}

function useWeek() {
  const [today, setToday] = useState(todayISO);
  const [start, setStart] = useState(() => readWeekStart(window.location.search, todayISO()));

  useEffect(() => {
    const sync = () => {
      const now = todayISO();
      setToday(now);
      setStart(readWeekStart(window.location.search, now));
    };
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  const go = useCallback((next) => {
    const now = todayISO();
    const search = searchForWeek(window.location.search, next, now);
    const url = `${window.location.pathname}${search}${window.location.hash}`;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (url !== current) window.history.pushState(null, '', url);
    setToday(now);
    setStart(readWeekStart(search || '', now));
  }, []);

  return { start, today, go, atCurrent: start === startOfWeek(today) };
}

function Metric({ label, value }) {
  return (
    <div className="week-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function WeekScreen() {
  const { start, today, go, atCurrent } = useWeek();
  const days = useMemo(() => weekDays(start), [start]);
  const data = useData();
  const life = useLife();
  const program = useProgram();
  const habits = data.activeHabits;
  const meals = days.map((day) => data.nutritionFor(day));
  const food = weekFood(life.dailyNutrition, meals, days);
  const steps = weekSteps(life.dailySteps, days);
  const workouts = weekWorkouts(program.workouts, life.workoutLogs, days);
  const doneTasks = tasksCompletedInWeek(life.tasks, days);

  return (
    <div className="week-review">
      <div className="day-nav">
        <button type="button" className="day-arrow" aria-label="Previous week" onClick={() => go(addDays(start, -7))}>
          <Chevron dir="left" />
        </button>
        <div className="day-pick">
          <span>{weekLabel(start)}</span>
        </div>
        <button type="button" className="day-arrow" aria-label="Next week" disabled={atCurrent} onClick={() => go(addDays(start, 7))}>
          <Chevron dir="right" />
        </button>
      </div>

      <section>
        <h2>Habits</h2>
        {habits.length === 0 ? <p className="quiet">No habits.</p> : null}
        <ul className="week-habits">
          {habits.map((habit) => {
            const done = data.doneSetFor(habit.id);
            const grid = habitWeekCount(days, done);
            const streak = currentStreak(habit, done, today);
            return (
              <li key={habit.id} className="week-habit">
                <div className="week-habit-top">
                  <HabitMark habit={habit} />
                  <span className="habit-name">{habit.name}</span>
                  <span className="week-score">{grid.count}/7</span>
                  {streak > 0 ? <span className="week-streak">{streak} day streak</span> : null}
                </div>
                <div className="week-grid" aria-label={`${habit.name} ${grid.count} of 7`}>
                  {days.map((day, index) => (
                    <span key={day} className={`week-cell${grid.marks[index] ? ' is-on' : ''}`}>
                      <i aria-hidden="true" />
                      {WEEKDAY_INITIALS[index]}
                    </span>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2>Food</h2>
        {food.average == null ? (
          <p className="quiet">No food logged.</p>
        ) : (
          <p className="quiet">Average {food.average.toLocaleString('en-US')} kcal over {food.loggedDays} {food.loggedDays === 1 ? 'day' : 'days'}. Goal {food.goal.toLocaleString('en-US')}.</p>
        )}
        <div className="week-metrics">
          {food.rows.map((row, index) => (
            <Metric
              key={row.day}
              label={WEEKDAY_INITIALS[index]}
              value={row.calories == null ? 'None' : row.calories.toLocaleString('en-US')}
            />
          ))}
        </div>
        {food.proteinAverage != null ? (
          <p className="quiet">Protein average {food.proteinAverage} g.</p>
        ) : null}
      </section>

      {steps ? (
        <section>
          <h2>Steps</h2>
          <div className="week-metrics">
            {steps.map((row, index) => (
              <Metric
                key={row.day}
                label={WEEKDAY_INITIALS[index]}
                value={row.steps == null ? 'None' : formatStepCount(row.steps)}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h2>Workouts</h2>
        {workouts.scheduled === 0 ? (
          <p className="quiet">No workouts scheduled.</p>
        ) : (
          <>
            <p className="quiet">{workouts.done} of {workouts.scheduled} done.</p>
            <ul className="week-lines">
              {workouts.items.map((item) => (
                <li key={`${item.day}-${item.name}`}>
                  <span>{WEEKDAY_LABELS[days.indexOf(item.day)]} {item.name}</span>
                  <span className={item.done ? 'is-on' : ''}>{item.done ? 'Done' : 'Open'}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section>
        <h2>Tasks</h2>
        {doneTasks.length === 0 ? (
          <p className="quiet">None completed.</p>
        ) : (
          <ul className="week-lines">
            {doneTasks.map((task) => (
              <li key={task.id}>
                <span>{task.title}</span>
                <span className="is-on">Done</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
