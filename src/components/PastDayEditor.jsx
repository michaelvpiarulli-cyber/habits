import { useEffect, useRef, useState } from 'react';
import { useData } from '../context/DataProvider';
import { formatLong, todayISO } from '../lib/dates';
import { isComplete, targetOf } from '../lib/habits';
import { isDue } from '../lib/streaks';

function ValueEditor({ habit, day }) {
  const { logFor, setValue, toggleDay } = useData();
  const log = logFor(habit.id, day);
  const value = Number(log?.amount) || 0;
  const [draft, setDraft] = useState(String(value || ''));
  const numerical = habit.kind !== 'check';

  if (!numerical) {
    const complete = isComplete(habit, log);
    return (
      <button
        type="button"
        className={`past-edit__toggle ${complete ? 'is-on' : ''}`}
        onClick={() => day < todayISO() && toggleDay(habit, day)}
        aria-pressed={complete}
      >
        {complete ? 'Done' : 'Mark done'}
      </button>
    );
  }

  return (
    <form
      className="past-edit__value"
      onSubmit={(event) => {
        event.preventDefault();
        if (day < todayISO()) setValue(habit, day, Number(draft) || 0);
      }}
    >
      <label>
        <span className="visually-hidden">{habit.name}</span>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={draft}
          placeholder="0"
          onChange={(event) => setDraft(event.target.value)}
        />
        {habit.unit && <span>{habit.unit}</span>}
      </label>
      <button type="submit">Save</button>
    </form>
  );
}

export function PastDayEditor({ day, onClose }) {
  const { activeHabits } = useData();
  const closeRef = useRef(null);
  const eligible = day < todayISO();

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!eligible) return null;

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="past-day-title">
      <button type="button" className="sheet__scrim" onClick={onClose} aria-label="Close day editor" />
      <section className="sheet__panel past-edit">
        <header className="sheet__head">
          <div>
            <p className="eyebrow">Edit the record</p>
            <h2 className="sheet__title" id="past-day-title">{formatLong(day)}</h2>
          </div>
          <button ref={closeRef} type="button" className="sheet__close" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="sheet__body">
          <ul className="past-edit__list">
            {activeHabits.map((habit) => (
              <li key={habit.id} className={!isDue(habit, day) ? 'is-off' : ''}>
                <div>
                  <strong>{habit.emoji && `${habit.emoji} `}{habit.name}</strong>
                  <span>
                    {!isDue(habit, day)
                      ? 'Not scheduled'
                      : habit.kind === 'count' || habit.kind === 'amount'
                        ? `Target ${targetOf(habit)} ${habit.unit || ''}`.trim()
                        : 'Scheduled'}
                  </span>
                </div>
                <ValueEditor key={`${habit.id}-${day}`} habit={habit} day={day} />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
