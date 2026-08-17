import { useEffect, useMemo, useState } from 'react';
import { useData } from '../context/DataProvider';
import { useLife } from '../context/LifeProvider';
import { useGoogle } from '../context/GoogleProvider';
import {
  addDays,
  dow,
  formatClock,
  formatLong,
  parseISO,
  relativeDay,
  todayISO,
} from '../lib/dates';
import { findTrainingHabit } from '../lib/habits';
import { isDue } from '../lib/streaks';
import { agendaRange, groupTasks } from '../lib/life';
import { sessionFor } from '../lib/workouts';
import { findWeighHabit, weeklyWeightRate, weighReadings } from '../lib/weightCoach';
import { Countdown } from './Countdown';
import { TrendChart } from './TrendChart';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function homeDate(iso) {
  const d = parseISO(iso);
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
}

function dayHeading(day, today) {
  if (day === today) return 'Today';
  if (day === addDays(today, 1)) return 'Tomorrow';
  return formatLong(day);
}

function Jump({ label, title, meta, onClick }) {
  return (
    <button type="button" className="home-jump" onClick={onClick}>
      <span>
        <span className="eyebrow">{label}</span>
        <span className="home-jump__name">{title}</span>
        {meta && <span className="home-jump__meta">{meta}</span>}
      </span>
      <span className="home-jump__go" aria-hidden="true">
        ›
      </span>
    </button>
  );
}

function TaskList({ tasks, today, onToggle, onOpen }) {
  if (tasks.length === 0) return <p className="quiet">Nothing dated. Add one above.</p>;
  return (
    <ul className="board__list">
      {tasks.map((task) => (
        <li key={task.id} className={`board__item ${task.dueDate < today ? 'is-overdue' : ''}`}>
          <button
            type="button"
            className={`task__check ${task.done ? 'is-on' : ''}`}
            aria-label="Mark done"
            onClick={() => onToggle(task.id)}
          />
          <button type="button" className="board__label" onClick={() => onOpen('more', 'tasks')}>
            <span>{task.title}</span>
            <span className="board__meta">
              {task.dueDate < today
                ? 'Overdue'
                : task.dueDate === today
                  ? task.dueTime
                    ? formatClock(task.dueTime)
                    : 'Today'
                  : relativeDay(task.dueDate, today)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function HomeView({ onOpen }) {
  const { activeHabits, doneSets, goals, statementOfDay, logFor } = useData();
  const { tasks, events, addTask, toggleTask } = useLife();
  const google = useGoogle();
  const [quick, setQuick] = useState('');
  const [googleEvents, setGoogleEvents] = useState([]);
  const today = todayISO();
  const weekEnd = addDays(today, 7);

  const training = findTrainingHabit(activeHabits);
  const habits = activeHabits.filter((habit) => habit.id !== training?.id);
  const dueHabits = habits.filter((habit) => isDue(habit, today));
  const habitsDone = dueHabits.filter((habit) => doneSets.get(habit.id)?.has(today)).length;
  const habitLeft = Math.max(0, dueHabits.length - habitsDone);

  const session = sessionFor(dow(today));
  const liftDone = training ? Number(logFor(training.id, today)?.amount) || 0 : 0;
  const liftTotal = session.lifts.length;
  const sessionDone = liftTotal > 0 && liftDone >= liftTotal;

  const weighHabit = useMemo(() => findWeighHabit(activeHabits), [activeHabits]);
  const readings = useMemo(
    () => weighReadings(weighHabit, logFor, today, 56),
    [weighHabit, logFor, today]
  );
  const trendPoints = useMemo(
    () => readings.map((row) => ({ day: row.day, value: row.weight })),
    [readings]
  );
  const weekRate = weeklyWeightRate(readings);

  const grouped = useMemo(() => groupTasks(tasks, today), [tasks, today]);
  const homeTasks = [...grouped.overdue, ...grouped.dueToday, ...grouped.upcoming].slice(0, 8);

  const listEvents = google.listEvents;
  const googleConnected = google.connected;

  useEffect(() => {
    if (!googleConnected) {
      setGoogleEvents([]);
      return undefined;
    }
    let cancelled = false;
    listEvents(today, weekEnd)
      .then((items) => {
        if (!cancelled) setGoogleEvents(items);
      })
      .catch(() => {
        if (!cancelled) setGoogleEvents([]);
      });
    return () => {
      cancelled = true;
    };
  }, [googleConnected, listEvents, today, weekEnd]);

  const agenda = useMemo(
    () =>
      agendaRange({ events, goals, googleEvents }, today, weekEnd).filter(
        (item) => item.source !== 'task' && !item.done
      ),
    [events, goals, googleEvents, today, weekEnd]
  );
  const agendaByDay = useMemo(() => {
    const map = new Map();
    for (const item of agenda) {
      const list = map.get(item.day);
      if (list) list.push(item);
      else map.set(item.day, [item]);
    }
    return [...map.entries()];
  }, [agenda]);

  const todayEvents = agenda.filter((item) => item.day === today);
  const ledeBits = [];
  if (weekRate != null && weekRate !== 0) {
    ledeBits.push(`${weekRate > 0 ? '+' : ''}${weekRate} lb/wk`);
  }
  if (grouped.overdue.length) ledeBits.push(`${grouped.overdue.length} overdue`);
  else if (grouped.dueToday.length) ledeBits.push(`${grouped.dueToday.length} due`);
  if (todayEvents.length) {
    ledeBits.push(`${todayEvents.length} event${todayEvents.length === 1 ? '' : 's'}`);
  }
  if (habitLeft) ledeBits.push(`${habitLeft} habit${habitLeft === 1 ? '' : 's'}`);
  if (!sessionDone) ledeBits.push(session.name);
  const lede = ledeBits.length ? ledeBits.join(' · ') : 'Caught up.';

  const submitQuick = (e) => {
    e.preventDefault();
    if (!quick.trim()) return;
    addTask({ title: quick.trim(), dueDate: today });
    setQuick('');
  };

  return (
    <div className="view view--home">
      <header className="view__head">
        <p className="eyebrow">{homeDate(today)}</p>
        <h1 className="view__title">{WEEKDAYS[dow(today)]}</h1>
        <p className="home__lede">{lede}</p>
      </header>

      <Countdown />

      <section className="section">
        <div className="section__head">
          <h2 className="eyebrow">Weight</h2>
          <button type="button" className="text-btn" onClick={() => onOpen('more', 'calories')}>
            Calories
          </button>
        </div>
        {weekRate != null && (
          <p className={`home-rate ${weekRate < 0 ? 'is-down' : weekRate > 0 ? 'is-up' : ''}`}>
            {weekRate > 0 ? '+' : ''}
            {weekRate} lb / week
          </p>
        )}
        <TrendChart
          points={trendPoints}
          target={weighHabit?.target || 0}
          unit={weighHabit?.unit || 'lb'}
        />
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="eyebrow">Tasks</h2>
          <button type="button" className="text-btn" onClick={() => onOpen('more', 'tasks')}>
            All
          </button>
        </div>
        <form className="quick-add" onSubmit={submitQuick}>
          <label className="visually-hidden" htmlFor="home-task">
            Add a task for today
          </label>
          <input
            id="home-task"
            className="field__input"
            value={quick}
            onChange={(e) => setQuick(e.target.value)}
            placeholder="Add a task for today"
          />
          <button type="submit" className="text-btn" disabled={!quick.trim()}>
            Add
          </button>
        </form>
        <TaskList tasks={homeTasks} today={today} onToggle={toggleTask} onOpen={onOpen} />
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="eyebrow">Events</h2>
          <button type="button" className="text-btn" onClick={() => onOpen('calendar')}>
            Plan
          </button>
        </div>
        {agendaByDay.length === 0 ? (
          <p className="quiet">Nothing on the calendar this week.</p>
        ) : (
          agendaByDay.map(([day, items]) => (
            <div key={day} className="home-day">
              <h3 className="eyebrow">{dayHeading(day, today)}</h3>
              <ul className="board__list">
                {items.map((item) => (
                  <li key={item.id} className="board__item">
                    <span className="board__time">
                      {item.allDay ? 'All day' : formatClock(item.startTime) || 'All day'}
                    </span>
                    {item.href ? (
                      <a className="board__label" href={item.href} target="_blank" rel="noreferrer">
                        {item.title}
                      </a>
                    ) : (
                      <button type="button" className="board__label" onClick={() => onOpen('calendar')}>
                        {item.title}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>

      <section className="home-jumps">
        <Jump
          label="Training"
          title={session.name}
          meta={
            sessionDone
              ? 'Session done'
              : liftDone > 0
                ? `${liftDone} of ${liftTotal} · ${session.focus}`
                : session.focus
          }
          onClick={() => onOpen('workout')}
        />
        <Jump
          label="Habits"
          title={dueHabits.length ? `${habitsDone} of ${dueHabits.length} done` : 'None due'}
          meta={habitLeft ? `${habitLeft} left` : dueHabits.length ? 'All in' : 'Add one under More'}
          onClick={() => onOpen('today')}
        />
      </section>

      {statementOfDay && (
        <div className="today-statement">
          <p className="eyebrow">Today’s value</p>
          <p className="today-statement__name">{statementOfDay.name}</p>
          {statementOfDay.note && <p className="today-statement__note">{statementOfDay.note}</p>}
        </div>
      )}
    </div>
  );
}
