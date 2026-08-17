import { useMemo } from 'react';
import { useData } from '../context/DataProvider';
import { useLife } from '../context/LifeProvider';
import { formatClock, todayISO } from '../lib/dates';
import { agendaForDay, groupTasks } from '../lib/life';

/** Quiet strip of due tasks and events for today. Hidden when the day is empty. */
export function TodayBoard({ onOpen }) {
  const { goals } = useData();
  const { tasks, events, toggleTask } = useLife();
  const today = todayISO();
  const grouped = useMemo(() => groupTasks(tasks, today), [tasks, today]);
  const agenda = useMemo(
    () => agendaForDay({ events, tasks, goals }, today).filter((item) => !item.done),
    [events, tasks, goals, today]
  );
  const due = [...grouped.overdue, ...grouped.dueToday];

  if (due.length === 0 && agenda.filter((item) => item.source !== 'task').length === 0) {
    return null;
  }

  const eventsOnly = agenda.filter((item) => item.source !== 'task');

  return (
    <section className="board">
      {due.length > 0 && (
        <>
          <p className="eyebrow">Due</p>
          <ul className="board__list">
            {due.slice(0, 5).map((task) => (
              <li key={task.id} className="board__item">
                <button
                  type="button"
                  className="task__check"
                  aria-label="Mark done"
                  onClick={() => toggleTask(task.id)}
                />
                <button type="button" className="board__label" onClick={() => onOpen('tasks')}>
                  <span>{task.title}</span>
                  <span className="board__meta">
                    {task.dueDate < today ? 'Overdue' : task.dueTime ? formatClock(task.dueTime) : 'Today'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {eventsOnly.length > 0 && (
        <>
          <p className="eyebrow">Today</p>
          <ul className="board__list">
            {eventsOnly.slice(0, 4).map((item) => (
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
        </>
      )}
    </section>
  );
}
