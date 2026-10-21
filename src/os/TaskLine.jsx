import { priorityLabel, priorityTone, TASK_PRIORITIES } from '../lib/life';

export function PriorityPicker({ value, onChange, label = 'Priority' }) {
  return (
    <span className="prio-pick" role="group" aria-label={label}>
      {TASK_PRIORITIES.map(([key, name]) => (
        <button
          key={key}
          type="button"
          className={`prio-chip tone-${priorityTone(key)}${value === key ? ' is-on' : ''}`}
          aria-pressed={value === key}
          onClick={() => onChange(key)}
        >
          {name}
        </button>
      ))}
    </span>
  );
}

export function TaskLine({ task, today, open, onToggle, onPriority }) {
  const tone = priorityTone(task.priority);
  const overdue = Boolean(task.dueDate && today && task.dueDate < today);
  const late = overdue && task.priority === 'urgent';
  return (
    <li className={`task-line tone-${tone}${late ? ' is-late' : ''}`}>
      <div className="task-main">
        <span className="task-bar" aria-hidden="true" />
        <span className="task-title">{task.title}</span>
        {onToggle ? (
          <button type="button" className="task-flag" aria-expanded={open} onClick={onToggle}>
            {priorityLabel(task.priority)}
          </button>
        ) : (
          <span className="task-flag">{priorityLabel(task.priority)}</span>
        )}
        {overdue ? <span className="faint">Overdue</span> : null}
      </div>
      {open && onPriority ? (
        <PriorityPicker value={task.priority || 'none'} onChange={onPriority} label={`Priority for ${task.title}`} />
      ) : null}
    </li>
  );
}
