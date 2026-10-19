import { useState } from 'react';
import { useData } from '../context/DataProvider';
import { useLife } from '../context/LifeProvider';
import { addDays, formatLong, todayISO } from '../lib/dates';
import { GOOGLE_CALENDAR_ACCOUNT } from '../lib/google';
import { nextProgress, progressOf, targetOf, topLevelGoals } from '../lib/goals';
import { groupTasks } from '../lib/life';
import { noteSnippet, noteTitle } from '../lib/notes';
import { daysWithAgenda } from '../lib/upcoming';
import { useGoogleAgenda } from './hooks';
import { AgendaList, Frame, Gear } from './ui';

function TaskForm({ onAdd, day }) {
  const [title, setTitle] = useState('');
  const [due, setDue] = useState(day);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!title.trim()) return;
        onAdd({ title, dueDate: due || null });
        setTitle('');
      }}
    >
      <label className="field">
        <span>Add a task</span>
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What needs doing" />
      </label>
      <label className="field">
        <span>Due</span>
        <input type="date" value={due} onChange={(event) => setDue(event.target.value)} />
      </label>
      <div className="btn-row"><button className="btn" type="submit">Add task</button></div>
    </form>
  );
}

export function PlanScreen({ onLog, onSettings }) {
  const today = todayISO();
  const data = useData();
  const life = useLife();
  const google = useGoogleAgenda(today, addDays(today, 14));
  const days = daysWithAgenda(life.events, google.events, today, 14);
  const grouped = groupTasks(life.tasks, today);
  const goals = topLevelGoals(data.goals);
  const reading = life.books.filter((book) => book.status === 'reading').slice(0, 3);
  const [editing, setEditing] = useState(null);
  const [goalTitle, setGoalTitle] = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const wrongAccount = google.connected && google.accountEmail && google.accountEmail.toLowerCase() !== GOOGLE_CALENDAR_ACCOUNT;

  const open = [...grouped.overdue, ...grouped.dueToday, ...grouped.upcoming, ...grouped.later];

  return (
    <Frame
      kicker="Coming up"
      title="Plan"
      actions={(
        <>
          <button type="button" className="text-btn" onClick={onLog}>Log</button>
          <button type="button" className="icon-btn" aria-label="Settings" onClick={onSettings}><Gear /></button>
        </>
      )}
    >
      <section className="card">
        <div className="card-head"><h2>Calendar</h2></div>
        {!google.connected ? <p className="quiet">Connect Google in Settings to see the primary calendar.</p> : null}
        {wrongAccount ? <p className="quiet">Connected as {google.accountEmail}. Switch to {GOOGLE_CALENDAR_ACCOUNT}.</p> : null}
        {google.note ? <p className="error">{google.note}</p> : null}
        {days.length === 0 ? <p className="quiet">Nothing in the next two weeks.</p> : days.map((day) => (
          <div key={day.day} style={{ marginTop: 14 }}>
            <h3>{day.day === today ? 'Today' : formatLong(day.day)}</h3>
            <AgendaList items={day.items} />
          </div>
        ))}
      </section>

      <section className="card">
        <div className="card-head"><h2>Tasks</h2><span className="faint">{open.length} open</span></div>
        {open.length === 0 ? <p className="quiet">Nothing waiting.</p> : (
          <ul className="food-list">
            {open.map((task) => (
              <li key={task.id}>
                <button type="button" className={`check ${task.done ? 'is-done' : ''}`} onClick={() => life.toggleTask(task.id)}>
                  <span className="box" aria-hidden="true" />
                  <span>
                    {task.title}
                    <div className="faint">{task.dueDate ? formatLong(task.dueDate) : 'No date'}{task.dueDate && task.dueDate < today ? ' · overdue' : ''}</div>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <TaskForm day={today} onAdd={life.addTask} />
      </section>

      <section className="card">
        <div className="card-head"><h2>Goals</h2></div>
        {goals.length === 0 ? <p className="quiet">No goals yet.</p> : goals.map((goal) => {
          const progress = progressOf(goal, { goals: data.goals, doneSets: null });
          const target = targetOf(goal, data.goals);
          return (
            <div key={goal.id} className="lift">
              <div className="row-between">
                <strong>{goal.title}</strong>
                <span className="faint">{progress} / {target}{goal.unit ? ` ${goal.unit}` : ''}</span>
              </div>
              <div className="meter" aria-hidden="true"><span style={{ width: `${Math.min(100, Math.round((progress / target) * 100))}%` }} /></div>
              <div className="btn-row">
                <button type="button" className="btn secondary" onClick={() => data.updateGoal(goal.id, { progress: nextProgress(goal, progress), done: nextProgress(goal, progress) >= target })}>+1</button>
                <button type="button" className="btn danger" onClick={() => data.deleteGoal(goal.id)}>Remove</button>
              </div>
            </div>
          );
        })}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!goalTitle.trim()) return;
            data.addGoal({ title: goalTitle, target: 1 });
            setGoalTitle('');
          }}
        >
          <label className="field">
            <span>New goal</span>
            <input value={goalTitle} onChange={(event) => setGoalTitle(event.target.value)} placeholder="A result you want" />
          </label>
          <div className="btn-row"><button className="btn" type="submit">Add goal</button></div>
        </form>
      </section>

      <section className="card">
        <div className="card-head"><h2>Notes</h2></div>
        {reading.length > 0 && (
          <p className="quiet" style={{ marginBottom: 8 }}>Reading {reading.map((book) => book.title).join(', ')}</p>
        )}
        <ul className="food-list">
          {life.notes.filter((note) => !note.archived).slice(0, 12).map((note) => (
            <li key={note.id}>
              <button
                type="button"
                onClick={() => {
                  setEditing(note.id);
                  setDraftTitle(note.title || '');
                  setDraftBody(note.body || '');
                }}
              >
                <strong>{noteTitle(note)}</strong>
                <div className="faint">{noteSnippet(note.body) || 'Empty note'}</div>
              </button>
              {editing === note.id && (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    life.updateNote(note.id, { title: draftTitle, body: draftBody });
                    setEditing(null);
                  }}
                >
                  <label className="field"><span>Title</span><input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} /></label>
                  <label className="field"><span>Body</span><textarea value={draftBody} onChange={(event) => setDraftBody(event.target.value)} /></label>
                  <div className="btn-row">
                    <button className="btn" type="submit">Save</button>
                    <button className="btn danger" type="button" onClick={() => life.deleteNote(note.id)}>Delete</button>
                  </div>
                </form>
              )}
            </li>
          ))}
        </ul>
        {!editing && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!draftTitle.trim() && !draftBody.trim()) return;
              life.addNote({ title: draftTitle, body: draftBody });
              setDraftTitle('');
              setDraftBody('');
            }}
          >
            <label className="field"><span>New note</span><input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} placeholder="Title" /></label>
            <label className="field"><span>Body</span><textarea value={draftBody} onChange={(event) => setDraftBody(event.target.value)} placeholder="A few lines" /></label>
            <div className="btn-row"><button className="btn" type="submit">Save note</button></div>
          </form>
        )}
      </section>
    </Frame>
  );
}
