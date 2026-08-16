import { useMemo, useState } from 'react';
import { useData } from '../context/DataProvider';
import { useLife } from '../context/LifeProvider';
import { useGoogle } from '../context/GoogleProvider';
import {
  addDays,
  endOfMonth,
  formatClock,
  formatLong,
  relativeDay,
  startOfMonth,
  todayISO,
} from '../lib/dates';
import { isDue } from '../lib/streaks';
import {
  agendaForDay,
  bookProgress,
  formatMoney,
  groupTasks,
  moneyForMonth,
  pipelineCounts,
} from '../lib/life';

export function DashboardView({ onOpen }) {
  const { activeHabits, doneSets, goals, nutritionFor } = useData();
  const { tasks, events, books, jobs, entries, addTask } = useLife();
  const google = useGoogle();
  const today = todayISO();
  const grouped = useMemo(() => groupTasks(tasks, today), [tasks, today]);
  const dueHabits = activeHabits.filter((habit) => isDue(habit, today));
  const habitsDone = dueHabits.filter((habit) => doneSets.get(habit.id)?.has(today)).length;
  const reading = books.filter((book) => book.status === 'reading');
  const pipeline = pipelineCounts(jobs);
  const month = moneyForMonth(entries, startOfMonth(today), endOfMonth(today));
  const food = nutritionFor(today);
  const agenda = agendaForDay({ events, tasks, goals }, today).slice(0, 4);
  const upcoming = [...grouped.overdue, ...grouped.dueToday, ...grouped.upcoming].slice(0, 4);
  const followUps = jobs.filter((job) => job.dueDate && job.dueDate <= addDays(today, 7));
  const [quick, setQuick] = useState('');

  const submitQuick = (e) => {
    e.preventDefault();
    if (!quick.trim()) return;
    addTask({ title: quick.trim(), dueDate: today });
    setQuick('');
  };

  return (
    <div className="view view--dash">
      <header className="view__head">
        <p className="eyebrow">{formatLong(today)}</p>
        <h1 className="view__title">
          Life, <em>in one place</em>
        </h1>
      </header>

      <form className="quick-add" onSubmit={submitQuick}>
        <label className="visually-hidden" htmlFor="quick-task">
          Add a task
        </label>
        <input
          id="quick-task"
          className="field__input"
          value={quick}
          onChange={(e) => setQuick(e.target.value)}
          placeholder="Add a task for today"
        />
        <button type="submit" className="btn btn--primary" disabled={!quick.trim()}>
          Add
        </button>
      </form>

      <section className="dash-grid">
        <button type="button" className="dash-card" onClick={() => onOpen('today')}>
          <p className="eyebrow">Habits</p>
          <p className="dash-card__num">
            {habitsDone}/{dueHabits.length || 0}
          </p>
          <p className="dash-card__meta">due today</p>
        </button>
        <button type="button" className="dash-card" onClick={() => onOpen('tasks')}>
          <p className="eyebrow">Tasks</p>
          <p className="dash-card__num">{grouped.open.length}</p>
          <p className="dash-card__meta">
            {grouped.overdue.length ? `${grouped.overdue.length} overdue` : 'open'}
          </p>
        </button>
        <button type="button" className="dash-card" onClick={() => onOpen('more', 'money')}>
          <p className="eyebrow">This month</p>
          <p className="dash-card__num">{formatMoney(month.net)}</p>
          <p className="dash-card__meta">
            in {formatMoney(month.income)} · out {formatMoney(month.spend)}
          </p>
        </button>
        <button type="button" className="dash-card" onClick={() => onOpen('more', 'jobs')}>
          <p className="eyebrow">Jobs</p>
          <p className="dash-card__num">{pipeline.active}</p>
          <p className="dash-card__meta">in motion</p>
        </button>
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="eyebrow">Today</h2>
          <button type="button" className="chip" onClick={() => onOpen('calendar')}>
            Calendar
          </button>
        </div>
        {agenda.length === 0 ? (
          <p className="empty__body">Nothing on the calendar yet. Tasks with due dates land here.</p>
        ) : (
          <ul className="agenda">
            {agenda.map((item) => (
              <li key={item.id} className={`agenda__row ${item.done ? 'is-done' : ''}`}>
                <span className="agenda__when">
                  {item.allDay ? 'All day' : formatClock(item.startTime) || 'All day'}
                </span>
                <span className="agenda__title">{item.title}</span>
                <span className="agenda__src">{item.source}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="eyebrow">Due</h2>
          <button type="button" className="chip" onClick={() => onOpen('tasks')}>
            All tasks
          </button>
        </div>
        {upcoming.length === 0 ? (
          <p className="empty__body">No dated tasks. Add one above.</p>
        ) : (
          <ul className="cards">
            {upcoming.map((task) => (
              <li key={task.id} className="card card--row">
                <div>
                  <p className="card__name">{task.title}</p>
                  <p className="card__meta">
                    {task.dueDate < today ? 'Overdue · ' : ''}
                    {relativeDay(task.dueDate)}
                    {task.dueTime ? ` · ${formatClock(task.dueTime)}` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {reading.length > 0 && (
        <section className="section">
          <div className="section__head">
            <h2 className="eyebrow">Reading</h2>
            <button type="button" className="chip" onClick={() => onOpen('more', 'books')}>
              Books
            </button>
          </div>
          <ul className="cards">
            {reading.slice(0, 2).map((book) => {
              const pct = Math.round(bookProgress(book) * 100);
              return (
                <li key={book.id} className="card">
                  <p className="card__name">{book.title}</p>
                  <p className="card__meta">{book.author || 'No author'}</p>
                  <div className="goal__bar" role="img" aria-label={`${pct} percent`}>
                    <span className="goal__fill" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="card__meta">
                    {book.currentPage}
                    {book.totalPages ? ` of ${book.totalPages}` : ''} pages
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {followUps.length > 0 && (
        <section className="section">
          <div className="section__head">
            <h2 className="eyebrow">Follow up</h2>
            <button type="button" className="chip" onClick={() => onOpen('more', 'jobs')}>
              Jobs
            </button>
          </div>
          <ul className="cards">
            {followUps.slice(0, 3).map((job) => (
              <li key={job.id} className="card">
                <p className="card__name">
                  {job.role} · {job.company}
                </p>
                <p className="card__meta">
                  {job.status} · {relativeDay(job.dueDate)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="section">
        <div className="section__head">
          <h2 className="eyebrow">Body</h2>
          <button type="button" className="chip" onClick={() => onOpen('more', 'calories')}>
            Calories
          </button>
        </div>
        <p className="dash-inline">
          {Math.round(food.calories || 0)} kcal · {Math.round(food.protein || 0)} g protein today
        </p>
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="eyebrow">Mail</h2>
          <button type="button" className="chip" onClick={() => onOpen('more', 'mail')}>
            Inbox
          </button>
        </div>
        <p className="dash-inline">
          {google.connected
            ? 'Google is connected — open Mail to read the inbox.'
            : 'Connect Google to read Gmail here and send due dates to Calendar.'}
        </p>
      </section>
    </div>
  );
}
