import { useMemo, useState } from 'react';
import { useData } from '../context/DataProvider';
import { useLife } from '../context/LifeProvider';
import {
  addDays,
  dow,
  endOfMonth,
  formatClock,
  parseISO,
  relativeDay,
  startOfMonth,
  todayISO,
} from '../lib/dates';
import { findTrainingHabit } from '../lib/habits';
import { isDue } from '../lib/streaks';
import {
  agendaForDay,
  bookProgress,
  formatMoney,
  groupTasks,
  JOB_ACTIVE,
  moneyForMonth,
} from '../lib/life';
import { sessionForDay } from '../lib/workouts';
import { Countdown } from './Countdown';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function homeDate(iso) {
  const d = parseISO(iso);
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
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

export function HomeView({ onOpen }) {
  const { activeHabits, doneSets, goals, statementOfDay, logFor, nutritionFor } = useData();
  const { tasks, events, books, jobs, entries, addTask, toggleTask } = useLife();
  const [quick, setQuick] = useState('');
  const today = todayISO();

  const training = findTrainingHabit(activeHabits);
  const habits = activeHabits.filter((habit) => habit.id !== training?.id);
  const dueHabits = habits.filter((habit) => isDue(habit, today));
  const habitsDone = dueHabits.filter((habit) => doneSets.get(habit.id)?.has(today)).length;
  const habitLeft = Math.max(0, dueHabits.length - habitsDone);

  const session = sessionForDay(today);
  const liftDone = training ? Number(logFor(training.id, today)?.amount) || 0 : 0;
  const liftTotal = session.lifts.length;
  const sessionDone = liftTotal > 0 && liftDone >= liftTotal;

  const grouped = useMemo(() => groupTasks(tasks, today), [tasks, today]);
  const due = [...grouped.overdue, ...grouped.dueToday];
  const nextUp = due.length ? [] : grouped.upcoming.slice(0, 3);
  const agenda = useMemo(
    () => agendaForDay({ events, tasks, goals }, today).filter((item) => item.source !== 'task' && !item.done),
    [events, tasks, goals, today]
  );

  const reading = books.filter((book) => book.status === 'reading');
  const followUps = jobs.filter(
    (job) => JOB_ACTIVE.has(job.status) && job.dueDate && job.dueDate <= addDays(today, 7)
  );
  const food = nutritionFor(today);
  const month = moneyForMonth(entries, startOfMonth(today), endOfMonth(today));

  const ledeBits = [];
  if (habitLeft) ledeBits.push(`${habitLeft} habit${habitLeft === 1 ? '' : 's'}`);
  if (!sessionDone) ledeBits.push(session.name);
  if (grouped.overdue.length) ledeBits.push(`${grouped.overdue.length} overdue`);
  else if (grouped.dueToday.length) ledeBits.push(`${grouped.dueToday.length} due`);
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

      {statementOfDay && (
        <div className="today-statement">
          <p className="eyebrow">Today’s value</p>
          <p className="today-statement__name">{statementOfDay.name}</p>
          {statementOfDay.note && <p className="today-statement__note">{statementOfDay.note}</p>}
          {statementOfDay.verseText && (
            <blockquote className="verse verse--today">
              <p className="verse__text">{statementOfDay.verseText}</p>
              {statementOfDay.verseRef && (
                <cite className="verse__ref">{statementOfDay.verseRef}</cite>
              )}
            </blockquote>
          )}
        </div>
      )}

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
        {due.length === 0 && nextUp.length === 0 ? (
          <p className="quiet">Nothing dated. Add one above.</p>
        ) : (
          <ul className="board__list">
            {(due.length ? due : nextUp).slice(0, 6).map((task) => (
              <li key={task.id} className="board__item">
                <button
                  type="button"
                  className={`task__check ${task.done ? 'is-on' : ''}`}
                  aria-label="Mark done"
                  onClick={() => toggleTask(task.id)}
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
        )}
      </section>

      {agenda.length > 0 && (
        <section className="section">
          <div className="section__head">
            <h2 className="eyebrow">Schedule</h2>
            <button type="button" className="text-btn" onClick={() => onOpen('calendar')}>
              Plan
            </button>
          </div>
          <ul className="board__list">
            {agenda.slice(0, 5).map((item) => (
              <li key={item.id} className="board__item">
                <span className="board__time">
                  {item.allDay ? 'All day' : formatClock(item.startTime)}
                </span>
                <button type="button" className="board__label" onClick={() => onOpen('calendar')}>
                  {item.title}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {followUps.length > 0 && (
        <section className="section">
          <div className="section__head">
            <h2 className="eyebrow">Follow up</h2>
            <button type="button" className="text-btn" onClick={() => onOpen('more', 'jobs')}>
              Jobs
            </button>
          </div>
          <ul className="board__list">
            {followUps.slice(0, 3).map((job) => (
              <li key={job.id} className="board__item">
                <button type="button" className="board__label" onClick={() => onOpen('more', 'jobs')}>
                  <span>
                    {job.role} · {job.company}
                  </span>
                  <span className="board__meta">{relativeDay(job.dueDate, today)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {reading.length > 0 && (
        <section className="section">
          <div className="section__head">
            <h2 className="eyebrow">Reading</h2>
            <button type="button" className="text-btn" onClick={() => onOpen('more', 'books')}>
              Books
            </button>
          </div>
          {reading.slice(0, 2).map((book) => {
            const pct = Math.round(bookProgress(book) * 100);
            return (
              <button
                key={book.id}
                type="button"
                className="home-jump"
                onClick={() => onOpen('more', 'books')}
              >
                <span>
                  <span className="home-jump__name">{book.title}</span>
                  <span className="home-jump__meta">
                    {book.currentPage}
                    {book.totalPages ? ` of ${book.totalPages}` : ''} · {pct}%
                  </span>
                </span>
              </button>
            );
          })}
        </section>
      )}

      {(food?.calories > 0 || month.spend > 0 || month.income > 0) && (
        <section className="section home-foot">
          {food?.calories > 0 && (
            <button type="button" className="text-btn" onClick={() => onOpen('more', 'calories')}>
              {Math.round(food.calories)} kcal
            </button>
          )}
          {(month.spend > 0 || month.income > 0) && (
            <button type="button" className="text-btn" onClick={() => onOpen('more', 'money')}>
              {formatMoney(month.net)} this month
            </button>
          )}
        </section>
      )}
    </div>
  );
}
