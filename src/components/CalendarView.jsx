import { useEffect, useMemo, useState } from 'react';
import { useData } from '../context/DataProvider';
import { useLife } from '../context/LifeProvider';
import { useGoogle } from '../context/GoogleProvider';
import {
  addMonths,
  endOfMonth,
  formatClock,
  formatLong,
  monthCells,
  monthTitle,
  startOfMonth,
  todayISO,
  WEEKDAY_INITIALS,
} from '../lib/dates';
import { agendaForDay, daysWithItems } from '../lib/life';
import { FormSheet } from './FormSheet';
import { GoogleConnect } from './GoogleConnect';

function EventForm({ event, day, onSave, onClose }) {
  const google = useGoogle();
  const [form, setForm] = useState(() => ({
    title: event?.title || '',
    notes: event?.notes || '',
    day: event?.day || day || todayISO(),
    startTime: event?.startTime || '',
    endTime: event?.endTime || '',
    allDay: event ? !!event.allDay : !event,
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

export function CalendarView() {
  const { goals } = useData();
  const { events, tasks, addEvent, updateEvent, deleteEvent } = useLife();
  const google = useGoogle();
  const today = todayISO();
  const [month, setMonth] = useState(today);
  const [selected, setSelected] = useState(today);
  const [googleEvents, setGoogleEvents] = useState([]);
  const [googleNote, setGoogleNote] = useState('');
  const [editing, setEditing] = useState(null);

  const monthEvents = google.monthEvents;
  const googleConnected = google.connected;

  useEffect(() => {
    if (!googleConnected) {
      setGoogleEvents([]);
      return undefined;
    }
    let cancelled = false;
    monthEvents(month)
      .then((items) => {
        if (!cancelled) setGoogleEvents(items);
      })
      .catch((err) => {
        if (!cancelled) setGoogleNote(err.message || 'Could not load Google Calendar.');
      });
    return () => {
      cancelled = true;
    };
  }, [googleConnected, month, monthEvents]);

  const marked = useMemo(
    () => daysWithItems({ events, tasks, goals, googleEvents }, startOfMonth(month), endOfMonth(month)),
    [events, tasks, goals, googleEvents, month]
  );
  const agenda = agendaForDay({ events, tasks, goals, googleEvents }, selected);
  const cells = monthCells(month);

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
    setSelected(form.day);
    setEditing(null);
  };

  return (
    <div className="view">
      <header className="view__head view__head--row">
        <div>
          <p className="eyebrow">Calendar</p>
          <h1 className="view__title">{monthTitle(month)}</h1>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setEditing({ day: selected })}>
          New
        </button>
      </header>

      <GoogleConnect compact />
      {googleNote && <p className="note note--bad">{googleNote}</p>}

      <div className="cal-nav">
        <button type="button" className="day-nav__btn" onClick={() => setMonth(addMonths(month, -1))} aria-label="Previous month">
          ‹
        </button>
        <button type="button" className="chip" onClick={() => { setMonth(today); setSelected(today); }}>
          Today
        </button>
        <button type="button" className="day-nav__btn" onClick={() => setMonth(addMonths(month, 1))} aria-label="Next month">
          ›
        </button>
      </div>

      <div className="cal" role="grid" aria-label={monthTitle(month)}>
        <div className="cal__weekdays">
          {WEEKDAY_INITIALS.map((d, i) => (
            <span key={`${d}-${i}`}>{d}</span>
          ))}
        </div>
        <div className="cal__grid">
          {cells.map((day, i) =>
            day ? (
              <button
                key={day}
                type="button"
                className={[
                  'cal__day',
                  day === today && 'is-today',
                  day === selected && 'is-selected',
                  marked.has(day) && 'has-items',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => setSelected(day)}
              >
                {Number(day.slice(-2))}
              </button>
            ) : (
              <span key={`pad-${i}`} className="cal__day is-pad" />
            )
          )}
        </div>
      </div>

      <section className="section">
        <h2 className="eyebrow">{formatLong(selected)}</h2>
        {agenda.length === 0 ? (
          <p className="empty__body">Free. Tasks with this due date, local events, and Google events show here.</p>
        ) : (
          <ul className="agenda">
            {agenda.map((item) => (
              <li key={item.id} className={`agenda__row ${item.done ? 'is-done' : ''}`}>
                <span className="agenda__when">
                  {item.allDay ? 'All day' : formatClock(item.startTime) || 'All day'}
                </span>
                <span className="agenda__title">
                  {item.href ? (
                    <a href={item.href} target="_blank" rel="noreferrer">
                      {item.title}
                    </a>
                  ) : (
                    item.title
                  )}
                </span>
                <span className="agenda__src">{item.source}</span>
                {item.source === 'event' && (
                  <span className="agenda__actions">
                    <button type="button" className="chip" onClick={() => setEditing(events.find((e) => e.id === item.recordId))}>
                      Edit
                    </button>
                    <button type="button" className="chip chip--danger" onClick={() => deleteEvent(item.recordId)}>
                      Delete
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {editing && (
        <EventForm
          event={editing.id ? editing : null}
          day={editing.day || selected}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
