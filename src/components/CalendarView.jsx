import { useEffect, useMemo, useRef, useState } from 'react';
import { useData } from '../context/DataProvider';
import { useLife } from '../context/LifeProvider';
import { useGoogle } from '../context/GoogleProvider';
import {
  addDays,
  clockOf,
  formatClock,
  formatLong,
  todayISO,
} from '../lib/dates';
import {
  agendaForDay,
  schedulableTasks,
  TASK_BLOCK_MINUTES,
  timelineBlocks,
  timelineHours,
  unscheduledAgenda,
} from '../lib/life';
import { FormSheet } from './FormSheet';
import { GoogleConnect } from './GoogleConnect';

function EventForm({ event, day, defaultStart, onSave, onClose }) {
  const google = useGoogle();
  const [form, setForm] = useState(() => ({
    title: event?.title || '',
    notes: event?.notes || '',
    day: event?.day || day || todayISO(),
    startTime: event?.startTime || defaultStart || '',
    endTime: event?.endTime || (defaultStart ? addEnd(defaultStart) : ''),
    allDay: event ? !!event.allDay : !defaultStart,
    location: event?.location || '',
    addToGoogle: false,
  }));
  const set = (patch) => setForm((current) => ({ ...current, ...patch }));

  return (
    <FormSheet title={event ? 'Edit event' : 'New event'} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.title.trim()) return;
          onSave({ ...form, allDay: form.allDay || !form.startTime });
        }}
      >
        <div className="field">
          <label className="field__label" htmlFor="event-title">
            Event
          </label>
          <input
            id="event-title"
            className="field__input"
            value={form.title}
            onChange={(e) => set({ title: e.target.value })}
            placeholder="Interview at Acme"
            autoFocus
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="event-day">
            Date
          </label>
          <input
            id="event-day"
            className="field__input"
            type="date"
            value={form.day}
            onChange={(e) => set({ day: e.target.value })}
          />
        </div>
        <label className="check">
          <input
            type="checkbox"
            checked={form.allDay}
            onChange={(e) => set({ allDay: e.target.checked })}
          />
          <span>All day</span>
        </label>
        {!form.allDay && (
          <div className="field field--split">
            <label className="field__label" htmlFor="event-start">
              Starts
            </label>
            <input
              id="event-start"
              className="field__input"
              type="time"
              value={form.startTime}
              onChange={(e) => set({ startTime: e.target.value })}
            />
            <label className="field__label" htmlFor="event-end">
              Ends
            </label>
            <input
              id="event-end"
              className="field__input"
              type="time"
              value={form.endTime}
              onChange={(e) => set({ endTime: e.target.value })}
            />
          </div>
        )}
        <div className="field">
          <label className="field__label" htmlFor="event-location">
            Where
          </label>
          <input
            id="event-location"
            className="field__input"
            value={form.location}
            onChange={(e) => set({ location: e.target.value })}
          />
        </div>
        <label className="check">
          <input
            type="checkbox"
            checked={form.addToGoogle}
            onChange={(e) => set({ addToGoogle: e.target.checked })}
          />
          <span>Also add to Google Calendar</span>
        </label>
        {form.addToGoogle && !google.connected && <GoogleConnect compact />}
        <button type="submit" className="btn btn--primary" disabled={!form.title.trim()}>
          Save
        </button>
      </form>
    </FormSheet>
  );
}

function addEnd(start) {
  const [h, m] = String(start || '09:00')
    .split(':')
    .map(Number);
  const total = (h * 60 + m + 60) % (24 * 60);
  return clockOf(total);
}

function TaskQuickForm({ day, defaultTime, onSave, onClose }) {
  const [title, setTitle] = useState('');
  const [dueTime, setDueTime] = useState(defaultTime || '');

  return (
    <FormSheet title={defaultTime ? `Task · ${formatClock(defaultTime)}` : 'New task'} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          onSave({
            title: title.trim(),
            dueDate: day,
            dueTime: dueTime || defaultTime || '',
          });
        }}
      >
        <div className="field">
          <label className="field__label" htmlFor="plan-task-title">
            Task
          </label>
          <input
            id="plan-task-title"
            className="field__input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ship PR review"
            autoFocus
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="plan-task-time">
            Time
          </label>
          <input
            id="plan-task-time"
            className="field__input"
            type="time"
            value={dueTime}
            onChange={(e) => setDueTime(e.target.value)}
          />
        </div>
        <p className="quiet">Leave time blank to park it in To schedule, then drop it on an hour.</p>
        <button type="submit" className="btn btn--primary" disabled={!title.trim()}>
          Save
        </button>
      </form>
    </FormSheet>
  );
}

function ScheduleSheet({ slot, tasks, onPickTask, onNewTask, onNewEvent, onClose }) {
  return (
    <FormSheet title={`Schedule · ${formatClock(slot)}`} onClose={onClose}>
      <p className="quiet">Park a task here, or add something new.</p>
      {tasks.length === 0 ? (
        <p className="quiet">No open tasks waiting yet.</p>
      ) : (
        <ul className="schedule-pick">
          {tasks.map((task) => (
            <li key={task.id}>
              <button type="button" className="schedule-pick__btn" onClick={() => onPickTask(task)}>
                <span className="schedule-pick__title">{task.title}</span>
                <span className="schedule-pick__meta">
                  {task.dueDate ? (task.dueDate < todayISO() ? 'Overdue' : 'Due today') : 'No date'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="plan-sheet-actions">
        <button type="button" className="btn btn--primary" onClick={onNewTask}>
          New task at {formatClock(slot)}
        </button>
        <button type="button" className="btn" onClick={onNewEvent}>
          New event at {formatClock(slot)}
        </button>
      </div>
    </FormSheet>
  );
}

function hourLabel(hour) {
  const am = hour < 12;
  const h12 = hour % 12 || 12;
  return `${h12} ${am ? 'am' : 'pm'}`;
}

export function CalendarView() {
  const { goals } = useData();
  const { events, tasks, addEvent, updateEvent, addTask, updateTask, toggleTask } = useLife();
  const google = useGoogle();
  const today = todayISO();
  const [day, setDay] = useState(today);
  const [googleEvents, setGoogleEvents] = useState([]);
  const [googleNote, setGoogleNote] = useState('');
  const [editing, setEditing] = useState(null);
  const [taskDraft, setTaskDraft] = useState(null);
  const [slotPick, setSlotPick] = useState(null);
  const [placingTaskId, setPlacingTaskId] = useState(null);
  const timelineRef = useRef(null);

  const monthEvents = google.monthEvents;
  const googleConnected = google.connected;

  useEffect(() => {
    if (!googleConnected) {
      setGoogleEvents([]);
      return undefined;
    }
    let cancelled = false;
    monthEvents(day)
      .then((items) => {
        if (!cancelled) setGoogleEvents(items);
      })
      .catch((err) => {
        if (!cancelled) setGoogleNote(err.message || 'Could not load Google Calendar.');
      });
    return () => {
      cancelled = true;
    };
  }, [googleConnected, day, monthEvents]);

  const agenda = useMemo(
    () => agendaForDay({ events, tasks, goals, googleEvents }, day),
    [events, tasks, goals, googleEvents, day]
  );
  const unscheduled = useMemo(() => unscheduledAgenda(agenda), [agenda]);
  const pool = useMemo(() => schedulableTasks(tasks, day), [tasks, day]);
  const hours = useMemo(() => timelineHours(agenda), [agenda]);
  const blocks = useMemo(() => timelineBlocks(agenda, { hours }), [agenda, hours]);
  const placingTask = placingTaskId ? tasks.find((t) => t.id === placingTaskId) : null;

  const nowTop = useMemo(() => {
    if (day !== today || !hours.length) return null;
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    const startMin = hours[0] * 60;
    const endMin = (hours[hours.length - 1] + 1) * 60;
    if (minutes < startMin || minutes > endMin) return null;
    return ((minutes - startMin) / (endMin - startMin)) * 100;
  }, [day, today, hours]);

  useEffect(() => {
    if (day !== today || !timelineRef.current || nowTop === null) return;
    const node = timelineRef.current;
    const target = (nowTop / 100) * node.scrollHeight - node.clientHeight * 0.3;
    node.scrollTop = Math.max(0, target);
  }, [day, today, nowTop]);

  const scheduleTask = (task, startTime) => {
    updateTask(task.id, {
      dueDate: day,
      dueTime: startTime,
    });
    setPlacingTaskId(null);
    setSlotPick(null);
  };

  const clearTaskTime = (taskId) => {
    updateTask(taskId, { dueTime: '' });
  };

  const save = async (form) => {
    let googleEventId = editing?.googleEventId || '';
    setGoogleNote('');
    if (form.addToGoogle) {
      try {
        if (!google.connected) await google.connect();
        const created = await google.addToCalendar({
          title: form.title.trim(),
          day: form.day,
          startTime: form.startTime,
          endTime: form.endTime,
          allDay: form.allDay,
          notes: form.notes,
          location: form.location,
        });
        googleEventId = created.id;
        setGoogleEvents((prev) => [...prev, created]);
      } catch (err) {
        setGoogleNote(err.message || 'Saved locally, but Google Calendar did not accept it.');
      }
    }
    const fields = {
      title: form.title.trim(),
      notes: form.notes,
      day: form.day,
      startTime: form.startTime,
      endTime: form.endTime,
      allDay: form.allDay,
      location: form.location,
      googleEventId,
    };
    if (editing?.id) updateEvent(editing.id, fields);
    else addEvent(fields);
    setDay(form.day);
    setEditing(null);
  };

  const onHourClick = (hour) => {
    const startTime = clockOf(hour * 60);
    if (placingTask) {
      scheduleTask(placingTask, startTime);
      return;
    }
    setSlotPick(startTime);
  };

  const viewingToday = day === today;

  return (
    <div className="view view--plan">
      <header className="view__head">
        <div className="day-nav">
          <button
            type="button"
            className="day-nav__btn"
            onClick={() => setDay(addDays(day, -1))}
            aria-label="Previous day"
          >
            ‹
          </button>
          <div className="day-nav__center">
            <p className="eyebrow">{formatLong(day)}</p>
            {!viewingToday && (
              <button type="button" className="day-nav__today" onClick={() => setDay(today)}>
                Back to today
              </button>
            )}
          </div>
          <button
            type="button"
            className="day-nav__btn"
            onClick={() => setDay(addDays(day, 1))}
            aria-label="Next day"
          >
            ›
          </button>
        </div>
        <div className="view__head--row">
          <h1 className="view__title">Plan</h1>
          <div className="plan-head-actions">
            <button type="button" className="text-btn" onClick={() => setTaskDraft({ day })}>
              Task
            </button>
            <button
              type="button"
              className="text-btn"
              onClick={() => setEditing({ day, startTime: '', allDay: true })}
            >
              Event
            </button>
          </div>
        </div>
      </header>

      <GoogleConnect compact />
      {googleNote && <p className="note note--bad">{googleNote}</p>}

      <section className="section plan-tray">
        <div className="section__head">
          <h2 className="eyebrow">To schedule</h2>
          <div className="plan-tray__actions">
            {placingTask && (
              <button type="button" className="text-btn" onClick={() => setPlacingTaskId(null)}>
                Cancel
              </button>
            )}
            <button type="button" className="text-btn" onClick={() => setTaskDraft({ day })}>
              Add
            </button>
          </div>
        </div>
        {pool.length === 0 ? (
          <p className="quiet">Nothing waiting. Add a task, then park it on the timeline.</p>
        ) : (
          <>
            <p className="quiet">
              {placingTask
                ? `Tap an hour to place “${placingTask.title}”.`
                : 'Tap a task, then an hour — or tap an hour to pick.'}
            </p>
            <ul className="plan-tray__list">
              {pool.map((task) => (
                <li key={task.id}>
                  <button
                    type="button"
                    className={`plan-tray__chip ${placingTaskId === task.id ? 'is-on' : ''}`}
                    onClick={() =>
                      setPlacingTaskId((current) => (current === task.id ? null : task.id))
                    }
                  >
                    {task.title}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {unscheduled.filter((item) => item.source !== 'task' || item.done).length > 0 && (
        <section className="section">
          <h2 className="eyebrow">All day</h2>
          <ul className="agenda">
            {unscheduled
              .filter((item) => item.source !== 'task' || item.done)
              .map((item) => (
                <li key={item.id} className={`agenda__row ${item.done ? 'is-done' : ''}`}>
                  <span className="agenda__when">All day</span>
                  <span className="agenda__title">
                    {item.href ? (
                      <a href={item.href} target="_blank" rel="noreferrer">
                        {item.title}
                      </a>
                    ) : (
                      item.title
                    )}
                  </span>
                  {item.source === 'event' && (
                    <button
                      type="button"
                      className="text-btn"
                      onClick={() => setEditing(events.find((e) => e.id === item.recordId))}
                    >
                      Edit
                    </button>
                  )}
                </li>
              ))}
          </ul>
        </section>
      )}

      <section className="section plan-timeline" aria-label="Day timeline">
        <h2 className="eyebrow">Timeline</h2>
        <div className="plan-timeline__scroll" ref={timelineRef}>
          <div
            className="plan-timeline__grid"
            style={{ '--plan-hours': hours.length, '--plan-hour': '56px' }}
          >
            <div className="plan-timeline__hours" aria-hidden="true">
              {hours.map((hour) => (
                <div key={hour} className="plan-timeline__hour">
                  <span>{hourLabel(hour)}</span>
                </div>
              ))}
            </div>
            <div className="plan-timeline__lanes">
              {hours.map((hour) => (
                <button
                  key={hour}
                  type="button"
                  className={`plan-timeline__slot ${placingTask ? 'is-target' : ''}`}
                  aria-label={`Schedule at ${hourLabel(hour)}`}
                  onClick={() => onHourClick(hour)}
                />
              ))}
              {nowTop !== null && (
                <div className="plan-timeline__now" style={{ top: `${nowTop}%` }} aria-hidden="true" />
              )}
              {blocks.map((block) => (
                <div
                  key={block.id}
                  className={[
                    'plan-block',
                    `plan-block--${block.source}`,
                    block.done && 'is-done',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{ top: `${block.top}%`, height: `${block.height}%` }}
                >
                  {block.source === 'task' ? (
                    <>
                      <button
                        type="button"
                        className={`task__check ${block.done ? 'is-on' : ''}`}
                        aria-pressed={!!block.done}
                        aria-label={block.done ? 'Mark not done' : 'Mark done'}
                        onClick={() => toggleTask(block.recordId)}
                      />
                      <div className="plan-block__body">
                        <span className="plan-block__when">
                          {formatClock(block.startTime)}
                          {block.endTime ? `–${formatClock(block.endTime)}` : ''}
                        </span>
                        <span className="plan-block__title">{block.title}</span>
                        <div className="plan-block__actions">
                          <button
                            type="button"
                            className="text-btn"
                            onClick={() => clearTaskTime(block.recordId)}
                          >
                            Unschedule
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="plan-block__hit"
                      onClick={() => {
                        if (block.source === 'event') {
                          setEditing(events.find((e) => e.id === block.recordId) || null);
                        } else if (block.href) {
                          window.open(block.href, '_blank', 'noreferrer');
                        }
                      }}
                    >
                      <span className="plan-block__when">
                        {formatClock(block.startTime)}
                        {block.endTime ? `–${formatClock(block.endTime)}` : ''}
                      </span>
                      <span className="plan-block__title">{block.title}</span>
                      {block.detail && <span className="plan-block__detail">{block.detail}</span>}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        <p className="quiet plan-timeline__hint">
          Blocks are {TASK_BLOCK_MINUTES} min for tasks. Events keep their own end time.
        </p>
      </section>

      {slotPick && (
        <ScheduleSheet
          slot={slotPick}
          tasks={pool}
          onPickTask={(task) => scheduleTask(task, slotPick)}
          onNewTask={() => {
            const start = slotPick;
            setSlotPick(null);
            setTaskDraft({ day, dueTime: start });
          }}
          onNewEvent={() => {
            const start = slotPick;
            setSlotPick(null);
            setEditing({ day, startTime: start, endTime: addEnd(start), allDay: false });
          }}
          onClose={() => setSlotPick(null)}
        />
      )}

      {taskDraft && (
        <TaskQuickForm
          day={taskDraft.day || day}
          defaultTime={taskDraft.dueTime || ''}
          onSave={(fields) => {
            addTask(fields);
            setTaskDraft(null);
          }}
          onClose={() => setTaskDraft(null)}
        />
      )}

      {editing && (
        <EventForm
          event={editing.id ? editing : null}
          day={editing.day || day}
          defaultStart={editing.startTime || ''}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
