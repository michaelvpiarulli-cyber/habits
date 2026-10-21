import { useData } from '../context/DataProvider';
import { useLife } from '../context/LifeProvider';
import { todayISO } from '../lib/dates';
import { progressOf, targetOf, topLevelGoals } from '../lib/goals';
import { Collection } from './Collection';
import { useProgram } from '../os/hooks';

export function InlineDatabase({ source = 'tasks' }) {
  const life = useLife();
  const data = useData();
  const program = useProgram();
  const today = todayISO();

  if (source === 'goals') {
    const goals = topLevelGoals(data.goals);
    return (
      <Collection
        title="Goals"
        groupKey="status"
        rows={goals.map((goal) => {
          const progress = progressOf(goal, { goals: data.goals, doneSets: null });
          const target = targetOf(goal, data.goals);
          return {
            id: goal.id,
            title: goal.title,
            status: goal.done || progress >= target ? 'Done' : 'Open',
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
            next.done = patch.status === 'Done';
            next.progress = next.done ? (Number(goal?.target) || 1) : 0;
          }
          data.updateGoal(id, next);
        }}
      />
    );
  }

  if (source === 'watches') {
    return (
      <Collection
        title="Watch log"
        groupKey="status"
        rows={life.watches.filter((entry) => !entry.deleted).map((entry) => ({
          id: entry.id,
          title: entry.title,
          status: entry.rating ? 'Rated' : 'Logged',
          date: entry.watchedOn || '',
          rating: entry.rating ? String(entry.rating) : '',
          tags: 'Watch',
          url: entry.link || '',
        }))}
        columns={[
          { key: 'title', label: 'Name', kind: 'title' },
          { key: 'status', label: 'Status', kind: 'status', options: ['Logged', 'Rated'] },
          { key: 'date', label: 'Date', kind: 'date' },
          { key: 'rating', label: 'Rating', kind: 'number', options: ['1', '2', '3', '4', '5'] },
          { key: 'url', label: 'URL', kind: 'url' },
          { key: 'tags', label: 'Tags', kind: 'tags' },
        ]}
        onAdd={(title) => life.addWatch({ title, watchedOn: today })}
        onUpdate={(id, patch) => {
          const next = {};
          if (patch.title != null) next.title = patch.title;
          if (patch.date != null) next.watchedOn = patch.date || null;
          if (patch.rating != null) next.rating = patch.rating ? Number(patch.rating) : null;
          if (patch.url != null) next.link = patch.url;
          if (patch.status === 'Logged') next.rating = null;
          life.updateWatch(id, next);
        }}
      />
    );
  }

  if (source === 'workouts') {
    return (
      <Collection
        title="Workouts"
        groupKey="status"
        readOnly
        rows={(program.workouts || []).map((workout) => ({
          id: workout.id,
          title: workout.name,
          status: workout.kind || 'other',
          tags: (workout.days || []).join(', '),
          weekdays: workout.days || [],
          priority: workout.pattern || '',
        }))}
        columns={[
          { key: 'title', label: 'Name', kind: 'title' },
          { key: 'status', label: 'Status', kind: 'status' },
          { key: 'tags', label: 'Days', kind: 'tags' },
          { key: 'priority', label: 'Schedule', kind: 'plain' },
        ]}
      />
    );
  }

  return (
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
        done: task.done,
      }))}
      columns={[
        { key: 'title', label: 'Name', kind: 'title' },
        { key: 'done', label: 'Done', kind: 'checkbox' },
        { key: 'status', label: 'Status', kind: 'status', options: ['Open', 'Done'] },
        { key: 'date', label: 'Date', kind: 'date' },
        { key: 'tags', label: 'Tags', kind: 'multi', options: ['inbox', 'work', 'personal', 'errands'] },
        { key: 'priority', label: 'Priority', kind: 'select', options: ['urgent', 'high', 'medium', 'low', 'none'] },
      ]}
      onAdd={(title) => life.addTask({ title, dueDate: today })}
      onUpdate={(id, patch) => {
        const next = {};
        if (patch.title != null) next.title = patch.title;
        if (patch.date != null) next.dueDate = patch.date || null;
        if (patch.tags != null) next.list = patch.tags || 'inbox';
        if (patch.priority != null) next.priority = patch.priority;
        if (patch.done != null) next.done = patch.done === true || patch.done === 'true';
        if (patch.status != null) next.done = patch.status === 'Done';
        if (next.done != null) next.completedAt = next.done ? new Date().toISOString() : null;
        life.updateTask(id, next);
      }}
    />
  );
}
