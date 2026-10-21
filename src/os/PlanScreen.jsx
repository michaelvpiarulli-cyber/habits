import { useLife } from '../context/LifeProvider';
import { addDays, formatLong, todayISO } from '../lib/dates';
import { GOOGLE_CALENDAR_ACCOUNT } from '../lib/google';
import { daysWithAgenda } from '../lib/upcoming';
import { Collection } from '../shell/Collection';
import { useGoogleAgenda } from './hooks';
import { AgendaList } from './ui';

export function PlanScreen() {
  const today = todayISO();
  const life = useLife();
  const google = useGoogleAgenda(today, addDays(today, 14));
  const days = daysWithAgenda(life.events, google.events, today, 14);
  const wrongAccount = google.connected && google.accountEmail && google.accountEmail.toLowerCase() !== GOOGLE_CALENDAR_ACCOUNT;

  return (
    <div className="board">
      <section>
        <h2>Calendar</h2>
        {!google.connected ? <p className="quiet">Connect Google in Settings.</p> : null}
        {wrongAccount ? <p className="quiet">Connected as {google.accountEmail}. Switch to {GOOGLE_CALENDAR_ACCOUNT}.</p> : null}
        {google.note ? <p className="error">{google.note}</p> : null}
        {days.length === 0 ? <p className="quiet">Nothing in the next two weeks.</p> : days.map((day) => (
          <div key={day.day} style={{ marginTop: 18 }}>
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
          { key: 'tags', label: 'Tags', kind: 'multi', options: ['inbox', 'work', 'personal', 'errands'] },
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
    </div>
  );
}
