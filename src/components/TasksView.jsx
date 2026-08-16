import { useMemo, useState } from 'react';
import { useLife } from '../context/LifeProvider';
import { useGoogle } from '../context/GoogleProvider';
import { formatClock, relativeDay, todayISO } from '../lib/dates';
import { groupTasks, TASK_LISTS, TASK_PRIORITIES } from '../lib/life';
import { FormSheet } from './FormSheet';
import { GoogleConnect } from './GoogleConnect';

function TaskForm({ task, onSave, onClose }) {
  const google = useGoogle();
  const [form, setForm] = useState(() => ({
    title: task?.title || '',
    notes: task?.notes || '',
    dueDate: task?.dueDate || todayISO(),
    dueTime: task?.dueTime || '',
    list: task?.list || 'inbox',
    priority: task?.priority || 'none',
    addToGoogle: false,
  }));
  const set = (patch) => setForm((current) => ({ ...current, ...patch }));
  const canSave = form.title.trim();

  return (
    <FormSheet title={task ? 'Edit task' : 'New task'} onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!canSave) return;
          await onSave(form);
        }}
      >
        <div className="field">
          <label className="field__label" htmlFor="task-title">
            Task
          </label>
          <input
            id="task-title"
            className="field__input"
            value={form.title}
            onChange={(e) => set({ title: e.target.value })}
            placeholder="Follow up with recruiter"
            autoFocus
          />
        </div>
        <div className="field field--split">
          <label className="field__label" htmlFor="task-due">
            Due
          </label>
          <input
            id="task-due"
            className="field__input"
            type="date"
            value={form.dueDate || ''}
            onChange={(e) => set({ dueDate: e.target.value || null })}
          />
          <label className="field__label" htmlFor="task-time">
            Time
          </label>
          <input
            id="task-time"
            className="field__input"
            type="time"
            value={form.dueTime}
            onChange={(e) => set({ dueTime: e.target.value })}
          />
        </div>
        <div className="field field--split">
          <label className="field__label" htmlFor="task-list">
            List
          </label>
          <select
            id="task-list"
            className="field__input"
            value={form.list}
            onChange={(e) => set({ list: e.target.value })}
          >
            {TASK_LISTS.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
          <label className="field__label" htmlFor="task-priority">
            Priority
          </label>
          <select
            id="task-priority"
            className="field__input"
            value={form.priority}
            onChange={(e) => set({ priority: e.target.value })}
          >
            {TASK_PRIORITIES.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field__label" htmlFor="task-notes">
            Notes
          </label>
          <textarea
            id="task-notes"
            className="field__input field__input--area"
            rows={3}
            value={form.notes}
            onChange={(e) => set({ notes: e.target.value })}
          />
        </div>
        {form.dueDate && (
          <label className="check">
            <input
              type="checkbox"
              checked={form.addToGoogle}
              onChange={(e) => set({ addToGoogle: e.target.checked })}
            />
            <span>Also add to Google Calendar</span>
          </label>
        )}
        {form.addToGoogle && !google.connected && <GoogleConnect compact />}
        <button type="submit" className="btn btn--primary" disabled={!canSave}>
          Save
        </button>
      </form>
    </FormSheet>
  );
}

function TaskRow({ task, today, onToggle, onEdit, onDelete }) {
  const overdue = task.dueDate && !task.done && task.dueDate < today;
  return (
    <li className={`task ${task.done ? 'is-done' : ''} ${overdue ? 'is-overdue' : ''}`}>
      <button
        type="button"
        className={`task__check ${task.done ? 'is-on' : ''}`}
        aria-pressed={task.done}
        aria-label={task.done ? 'Mark not done' : 'Mark done'}
        onClick={() => onToggle(task.id)}
      />
      <button type="button" className="task__body" onClick={onEdit}>
        <span className="task__title">{task.title}</span>
        <span className="task__meta">
          {task.dueDate
            ? `${overdue ? 'Due ' : ''}${relativeDay(task.dueDate)}${task.dueTime ? ` · ${formatClock(task.dueTime)}` : ''}`
            : 'No date'}
          {task.priority !== 'none' ? ` · ${task.priority}` : ''}
        </span>
      </button>
      <button type="button" className="chip chip--danger" onClick={() => onDelete(task.id)}>
        Delete
      </button>
    </li>
  );
}

export function TasksView() {
  const { tasks, addTask, updateTask, toggleTask, deleteTask } = useLife();
  const google = useGoogle();
  const today = todayISO();
  const grouped = useMemo(() => groupTasks(tasks, today), [tasks, today]);
  const [editing, setEditing] = useState(null);
  const [showDone, setShowDone] = useState(false);
  const [googleNote, setGoogleNote] = useState('');

  const save = async (form) => {
    let googleEventId = editing?.googleEventId || '';
    setGoogleNote('');
    if (form.addToGoogle && form.dueDate) {
      try {
        if (!google.connected) {
          const result = await google.connect();
          if (result?.error) throw new Error(result.error);
        }
        const created = await google.addToCalendar({
          title: form.title.trim(),
          day: form.dueDate,
          startTime: form.dueTime,
          allDay: !form.dueTime,
          notes: form.notes,
        });
        googleEventId = created.id;
      } catch (err) {
        setGoogleNote(err.message || 'Saved the task, but Google Calendar did not accept it.');
      }
    }
    const fields = {
      title: form.title.trim(),
      notes: form.notes,
      dueDate: form.dueDate || null,
      dueTime: form.dueTime,
      list: form.list,
      priority: form.priority,
      googleEventId,
    };
    if (editing?.id) updateTask(editing.id, fields);
    else addTask(fields);
    setEditing(null);
  };

  const sections = [
    ['Overdue', grouped.overdue],
    ['Today', grouped.dueToday],
    ['Upcoming', grouped.upcoming],
    ['Later', grouped.later],
  ];

  return (
    <div className="view">
      <header className="view__head view__head--row">
        <div>
          <p className="eyebrow">{grouped.open.length} open</p>
          <h1 className="view__title">Tasks</h1>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setEditing({})}>
          New
        </button>
      </header>

      {googleNote && <p className="note note--bad">{googleNote}</p>}

      {sections.map(([label, list]) =>
        list.length ? (
          <section key={label} className="section">
            <h2 className="eyebrow">{label}</h2>
            <ul className="task-list">
              {list.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  today={today}
                  onToggle={toggleTask}
                  onEdit={() => setEditing(task)}
                  onDelete={deleteTask}
                />
              ))}
            </ul>
          </section>
        ) : null
      )}

      {sections.every(([, list]) => list.length === 0) && (
        <div className="empty">
          <p className="empty__title">Nothing waiting</p>
          <p className="empty__body">Add a task with a due date and it will show on the calendar.</p>
        </div>
      )}

      {grouped.done.length > 0 && (
        <section className="section">
          <button type="button" className="chip" onClick={() => setShowDone((v) => !v)}>
            {showDone ? 'Hide done' : `Show ${grouped.done.length} done`}
          </button>
          {showDone && (
            <ul className="task-list">
              {grouped.done.slice(0, 20).map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  today={today}
                  onToggle={toggleTask}
                  onEdit={() => setEditing(task)}
                  onDelete={deleteTask}
                />
              ))}
            </ul>
          )}
        </section>
      )}

      {editing !== null && (
        <TaskForm
          task={editing.id ? editing : null}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
