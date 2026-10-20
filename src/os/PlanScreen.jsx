import { useState } from 'react';
import { useData } from '../context/DataProvider';
import { useLife } from '../context/LifeProvider';
import { addDays, formatLong, todayISO } from '../lib/dates';
import { GOOGLE_CALENDAR_ACCOUNT } from '../lib/google';
import { progressOf, targetOf, topLevelGoals } from '../lib/goals';
import { noteSnippet, noteTitle } from '../lib/notes';
import { daysWithAgenda } from '../lib/upcoming';
import { Collection } from '../shell/Collection';
import { useGoogleAgenda } from './hooks';
import { AgendaList, Frame, Gear } from './ui';

export function PlanScreen({ onLog, onSettings }) {
  const today = todayISO();
  const data = useData();
  const life = useLife();
  const google = useGoogleAgenda(today, addDays(today, 14));
  const days = daysWithAgenda(life.events, google.events, today, 14);
  const goals = topLevelGoals(data.goals);
  const reading = life.books.filter((book) => book.status === 'reading').slice(0, 3);
  const [editing, setEditing] = useState(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const wrongAccount = google.connected && google.accountEmail && google.accountEmail.toLowerCase() !== GOOGLE_CALENDAR_ACCOUNT;

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

      <Collection
        title="Tasks"
        groupKey="status"
        rows={life.tasks.filter((task) => !task.deleted).map((task) => ({
          id: task.id,
          title: task.title,
          status: task.done ? 'Done' : 'Open',
          date: task.dueDate || '',
          tags: task.list || 'inbox',
          priority: task.priority || 'none',
        }))}
        columns={[
          { key: 'title', label: 'Name', kind: 'title' },
          { key: 'status', label: 'Status', kind: 'status', options: ['Open', 'Done'] },
          { key: 'date', label: 'Date', kind: 'date' },
          { key: 'tags', label: 'Tags', kind: 'tags', options: ['inbox', 'work', 'personal', 'errands'] },
          { key: 'priority', label: 'Priority', kind: 'select', options: ['none', 'low', 'medium', 'high'] },
        ]}
        onAdd={(title) => life.addTask({ title, dueDate: today })}
        onUpdate={(id, patch) => {
          const next = {};
          if (patch.title != null) next.title = patch.title;
          if (patch.date != null) next.dueDate = patch.date || null;
          if (patch.tags != null) next.list = patch.tags || 'inbox';
          if (patch.priority != null) next.priority = patch.priority;
          if (patch.status != null) {
            next.done = patch.status === 'Done';
            next.completedAt = next.done ? new Date().toISOString() : null;
          }
          life.updateTask(id, next);
        }}
      />

      <Collection
        title="Goals"
        groupKey="status"
        rows={goals.map((goal) => {
          const progress = progressOf(goal, { goals: data.goals, doneSets: null });
          const target = targetOf(goal, data.goals);
          const done = goal.done || progress >= target;
          return {
            id: goal.id,
            title: goal.title,
            status: done ? 'Done' : 'Open',
            date: goal.dueDate || String(goal.createdAt || '').slice(0, 10),
            tags: goal.unit || 'Goal',
            priority: `${progress}/${target}`,
          };
        })}
        columns={[
          { key: 'title', label: 'Name', kind: 'title' },
          { key: 'status', label: 'Status', kind: 'status', options: ['Open', 'Done'] },
          { key: 'date', label: 'Date', kind: 'date' },
          { key: 'tags', label: 'Tags', kind: 'tags' },
          { key: 'priority', label: 'Progress', kind: 'plain' },
        ]}
        onAdd={(title) => data.addGoal({ title, target: 1 })}
        onUpdate={(id, patch) => {
          const goal = data.goals.find((item) => item.id === id);
          const next = {};
          if (patch.title != null) next.title = patch.title;
          if (patch.date != null) next.dueDate = patch.date || null;
          if (patch.tags != null) next.unit = patch.tags === 'Goal' ? '' : patch.tags;
          if (patch.status != null) {
            const done = patch.status === 'Done';
            next.done = done;
            next.progress = done ? (Number(goal?.target) || 1) : 0;
          }
          data.updateGoal(id, next);
        }}
      />

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
