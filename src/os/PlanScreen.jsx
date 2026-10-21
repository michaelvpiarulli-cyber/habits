import { useState } from 'react';
import { useLife } from '../context/LifeProvider';
import { agendaForDay } from '../lib/agenda';
import { addDays, formatLong, todayISO } from '../lib/dates';
import { GOOGLE_CALENDAR_ACCOUNT } from '../lib/google';
import { groupTasks } from '../lib/life';
import { Collection } from '../shell/Collection';
import { useGoogleAgenda } from './hooks';
import { PriorityPicker, TaskLine } from './TaskLine';
import { AgendaList } from './ui';

const PRIORITY_OPTIONS = ['urgent', 'high', 'medium', 'low', 'none'];

function DayTasks({ tasks, today, openId, setOpenId, onPriority }) {
  if (!tasks.length) return null;
  return (
    <ul className="task-day">
      {tasks.map((task) => (
        <TaskLine
          key={task.id}
          task={task}
          today={today}
          open={openId === task.id}
          onToggle={() => setOpenId((current) => (current === task.id ? null : task.id))}
          onPriority={(priority) => onPriority(task.id, priority)}
        />
      ))}
    </ul>
  );
}

export function PlanScreen() {
  const today = todayISO();
  const life = useLife();
  const google = useGoogleAgenda(today, addDays(today, 14));
  const grouped = groupTasks(life.tasks, today);
  const [draft, setDraft] = useState('');
  const [priority, setPriority] = useState('none');
  const [openId, setOpenId] = useState(null);
  const wrongAccount = google.connected && google.accountEmail && google.accountEmail.toLowerCase() !== GOOGLE_CALENDAR_ACCOUNT;

  const days = [];
  for (let step = 0; step < 14; step += 1) {
    const day = addDays(today, step);
    const events = agendaForDay(life.events, google.events, day);
    const tasks = (day === today ? grouped.dueToday : grouped.upcoming.filter((task) => task.dueDate === day));
    if (events.length || tasks.length) days.push({ day, events, tasks });
  }
  const quiet = grouped.overdue.length === 0 && days.length === 0;

  const setTaskPriority = (id, next) => life.updateTask(id, { priority: next });

  return (
    <div className="board">
      <section>
        <h2>Calendar</h2>
        {!google.connected ? <p className="quiet">Connect Google in Settings.</p> : null}
        {wrongAccount ? <p className="quiet">Connected as {google.accountEmail}. Switch to {GOOGLE_CALENDAR_ACCOUNT}.</p> : null}
        {google.note ? <p className="error">{google.note}</p> : null}
        <form
          className="task-add"
          onSubmit={(event) => {
            event.preventDefault();
            const title = draft.trim();
            if (!title) return;
            life.addTask({ title, dueDate: today, priority });
            setDraft('');
            setPriority('none');
          }}
        >
          <input aria-label="Task name" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Add a task" />
          <PriorityPicker value={priority} onChange={setPriority} />
          <button className="btn" type="submit">Add</button>
        </form>
        {grouped.overdue.length > 0 ? (
          <div className="plan-day">
            <h3>Overdue</h3>
            <DayTasks tasks={grouped.overdue} today={today} openId={openId} setOpenId={setOpenId} onPriority={setTaskPriority} />
          </div>
        ) : null}
        {quiet ? <p className="quiet">Nothing in the next two weeks.</p> : days.map((day) => (
          <div key={day.day} className="plan-day">
            <h3>{day.day === today ? 'Today' : formatLong(day.day)}</h3>
            <DayTasks tasks={day.tasks} today={today} openId={openId} setOpenId={setOpenId} onPriority={setTaskPriority} />
            {day.events.length ? <AgendaList items={day.events} /> : null}
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
          { key: 'tags', label: 'Tags', kind: 'multi', options: ['inbox', 'work', 'personal', 'errands'] },
          { key: 'priority', label: 'Priority', kind: 'select', options: PRIORITY_OPTIONS },
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
    </div>
  );
}
