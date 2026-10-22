import { useEffect, useState } from 'react';
import { useData } from '../context/DataProvider';
import { useLife } from '../context/LifeProvider';
import { agendaForDay } from '../lib/agenda';
import { readingsForDate, slotsFor } from '../lib/biblePlan';
import { addDays, formatClock, formatLong } from '../lib/dates';
import { ingestedFoodForDay, preferFoodEntry } from '../lib/foodGoals';
import { GOOGLE_CALENDAR_ACCOUNT } from '../lib/google';
import { isComplete, targetOf, valueOf } from '../lib/habits';
import { formatStepCount, isStepsHabit, stepsOnDay } from '../lib/steps';
import { compareByPriority, groupTasks, living } from '../lib/life';
import { workoutsOnDay } from '../lib/program';
import { isDue } from '../lib/streaks';
import { clockMinutes, nextTimedItem } from '../lib/upcoming';
import { DayTotal } from './DayTotal';
import { HabitMark } from './HabitMark';
import { useBible, useGoogleAgenda, useProgram } from './hooks';
import { TaskLine } from './TaskLine';
import { useViewDay } from './useViewDay';

function Chevron({ dir }) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {dir === 'left' ? <path d="M10 3.5 5.5 8 10 12.5" /> : <path d="M6 3.5 10.5 8 6 12.5" />}
    </svg>
  );
}

function DayNav({ day, today, onChange }) {
  const atToday = day === today;
  return (
    <div className="day-nav">
      <button type="button" className="day-arrow" aria-label="Previous day" onClick={() => onChange(addDays(day, -1))}>
        <Chevron dir="left" />
      </button>
      <label className="day-pick">
        <span>{formatLong(day)}</span>
        <input
          type="date"
          aria-label="Choose a date"
          max={today}
          value={day}
          onChange={(event) => {
            if (event.target.value) onChange(event.target.value);
          }}
        />
      </label>
      <button type="button" className="day-arrow" aria-label="Next day" disabled={atToday} onClick={() => onChange(addDays(day, 1))}>
        <Chevron dir="right" />
      </button>
      <button type="button" className="day-jump" aria-label="Back to today" disabled={atToday} onClick={() => onChange(today)}>
        Today
      </button>
    </div>
  );
}

function GlanceValue({ habit, day, value }) {
  const { setValue } = useData();
  const [draft, setDraft] = useState(value ? String(value) : '');
  useEffect(() => {
    setDraft(value ? String(value) : '');
  }, [value]);

  const commit = () => {
    const next = draft.trim();
    const amount = next === '' ? 0 : Number(next);
    if (!Number.isFinite(amount) || amount === value) return;
    setValue(habit, day, amount);
  };

  return (
    <span className="habit-entry">
      <input
        aria-label={habit.name}
        inputMode="decimal"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
      />
      {habit.unit ? <span className="habit-unit">{habit.unit}</span> : null}
    </span>
  );
}

function GlanceHabit({ habit, day, steps = null }) {
  const { logFor, toggleDay, bumpDay } = useData();
  const log = logFor(habit.id, day);
  const value = valueOf(habit, log);
  const complete = isComplete(habit, log);
  const numeric = habit.kind === 'amount' || habit.kind === 'measure';

  const tap = () => {
    if (habit.kind === 'count') bumpDay(habit, day);
    else toggleDay(habit, day);
  };

  if (numeric) {
    return (
      <li className={`glance-habit${complete ? ' is-done' : ''}`}>
        <HabitMark habit={habit} />
        <span className="habit-name">{habit.name}</span>
        {steps == null ? null : <span className="step-count">{formatStepCount(steps)}</span>}
        <GlanceValue habit={habit} day={day} value={value} />
      </li>
    );
  }

  return (
    <li className={`glance-habit${complete ? ' is-done' : ''}`}>
      <button
        type="button"
        className={`check habit-tap${complete ? ' is-done' : ''}`}
        aria-pressed={complete}
        aria-label={habit.name}
        onClick={tap}
      >
        <HabitMark habit={habit} />
        <span className="habit-name">{habit.name}</span>
        {steps == null ? null : <span className="step-count">{formatStepCount(steps)}</span>}
        <span className="box" aria-hidden="true">{habit.kind === 'count' && value > 0 && value < targetOf(habit) ? value : ''}</span>
      </button>
    </li>
  );
}

export function TodayScreen() {
  const { day, today, go } = useViewDay();
  const viewingToday = day === today;
  const now = new Date();
  const { activeHabits, nutritionFor } = useData();
  const life = useLife();
  const { dailyNutrition, dailySteps, events, tasks, workoutLogs, setWorkoutDone } = life;
  const program = useProgram();
  const bible = useBible();
  const google = useGoogleAgenda(day, addDays(day, 1));
  const agenda = agendaForDay(events, google.events, day);
  const nowMinutes = clockMinutes(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`) ?? 0;
  const next = viewingToday ? nextTimedItem(agenda, nowMinutes) : null;
  const session = workoutsOnDay(program.workouts, day);
  const workoutLog = workoutLogs.find((row) => row.day === day) || null;
  const ingested = ingestedFoodForDay(dailyNutrition, day);
  const food = preferFoodEntry(ingested, nutritionFor(day));
  const due = activeHabits.filter((habit) => isDue(habit, day));
  const reading = readingsForDate(day);
  const year = Number(day.slice(0, 4));
  const slots = reading.index == null ? new Set() : slotsFor(bible.checks, year, reading.index);
  const openTasks = groupTasks(tasks, today);
  const topTasks = [...openTasks.overdue, ...openTasks.dueToday].sort(compareByPriority).slice(0, 3);
  const datedTasks = living(tasks)
    .filter((task) => task.dueDate === day)
    .sort((a, b) => Number(a.done) - Number(b.done) || compareByPriority(a, b));
  const shownTasks = viewingToday ? topTasks : datedTasks;
  const wrongAccount =
    google.connected && google.accountEmail && google.accountEmail.toLowerCase() !== GOOGLE_CALENDAR_ACCOUNT;
  const sessionName = session.length ? session.map((workout) => workout.name).join(', ') : 'Rest';

  const markWorkout = () => {
    const planId = session[0]?.id || workoutLog?.planId || '';
    setWorkoutDone(day, planId, !workoutLog?.done);
  };

  return (
    <div className="glance">
      <div className="day-head">
        <DayNav day={day} today={today} onChange={go} />
        <div className="day-session">
          <p className="lede">{sessionName}</p>
          {session.length > 0 || workoutLog ? (
            <button
              type="button"
              className={`day-status${workoutLog?.done ? ' is-done' : ''}`}
              aria-pressed={Boolean(workoutLog?.done)}
              aria-label={workoutLog?.done ? 'Workout done' : 'Workout open'}
              onClick={markWorkout}
            >
              {workoutLog?.done ? 'Done' : 'Open'}
            </button>
          ) : null}
        </div>
      </div>

      <section>
        <h2>Food</h2>
        <DayTotal entry={food} />
      </section>

      <section>
        <h2>Bible</h2>
        {reading.catchUpDay ? (
          <p className="quiet">Catch up day.</p>
        ) : (
          <ul>
            {reading.readings.map((item) => (
              <li key={item.slot}>
                {item.ref}
                {slots.has(item.slot) ? <span className="faint"> Read</span> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Habits</h2>
        {due.length === 0 ? (
          <p className="quiet">Nothing due.</p>
        ) : (
          <ul>
            {due.map((habit) => (
              <GlanceHabit
                key={habit.id}
                habit={habit}
                day={day}
                steps={isStepsHabit(habit) ? stepsOnDay(dailySteps, day) : null}
              />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Tasks</h2>
        {shownTasks.length === 0 ? (
          <p className="quiet">Nothing due.</p>
        ) : (
          <ul>
            {shownTasks.map((task) => (
              <TaskLine key={task.id} task={task} today={viewingToday ? today : day} />
            ))}
          </ul>
        )}
      </section>

      {viewingToday ? (
        <section>
          <h2>Next</h2>
          {wrongAccount ? <p className="quiet">Calendar is connected as {google.accountEmail}.</p> : null}
          {!google.connected ? <p className="quiet">Calendar is not connected.</p> : null}
          {google.note ? <p className="error">{google.note}</p> : null}
          {next ? (
            <p>{next.title} at {formatClock(next.startTime)}</p>
          ) : (
            <p className="quiet">Nothing next.</p>
          )}
        </section>
      ) : agenda.length > 0 ? (
        <section>
          <h2>Events</h2>
          <ul>
            {agenda.map((item) => (
              <li key={item.id}>
                {item.allDay || !item.startTime ? item.title : `${item.title} at ${formatClock(item.startTime)}`}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
