import { useState } from 'react';
import { useData } from '../context/DataProvider';
import { todayISO } from '../lib/dates';
import { isComplete, targetOf, valueOf } from '../lib/habits';
import { isDue, remainingThisWeek } from '../lib/streaks';

function HabitRow({ habit, day }) {
  const { logFor, toggleDay, bumpDay, setValue, doneSetFor } = useData();
  const log = logFor(habit.id, day);
  const value = valueOf(habit, log);
  const complete = isComplete(habit, log);
  const needsNumber = habit.kind === 'amount' || habit.kind === 'measure';
  const [draft, setDraft] = useState(value ? String(value) : '');
  const weekLeft = habit.cadence === 'per_week' ? remainingThisWeek(habit, doneSetFor(habit.id), day) : null;

  let detail = complete ? 'Done' : 'Open';
  if (habit.kind === 'count') detail = `${value} of ${targetOf(habit)}${habit.unit ? ` ${habit.unit}` : ''}`;
  if (needsNumber) {
    detail = value
      ? `${value}${habit.unit ? ` ${habit.unit}` : ''}`
      : `Target ${targetOf(habit)}${habit.unit ? ` ${habit.unit}` : ''}`;
  }
  if (weekLeft != null) detail = `${detail} · ${weekLeft} left this week`;

  const tap = () => {
    if (needsNumber) return;
    if (habit.kind === 'count') bumpDay(habit, day);
    else toggleDay(habit, day);
  };

  return (
    <li>
      {needsNumber ? (
        <div className={`check ${complete ? 'is-done' : ''}`}>
          <span className="box" aria-hidden="true" />
          <span>
            <strong>{habit.name}</strong>
            <div className="faint">{detail}</div>
          </span>
        </div>
      ) : (
        <button type="button" className={`check ${complete ? 'is-done' : ''}`} onClick={tap}>
          <span className="box" aria-hidden="true" />
          <span>
            <strong>{habit.name}</strong>
            <div className="faint">{detail}</div>
          </span>
        </button>
      )}
      {needsNumber && (
        <form
          className="btn-row"
          onSubmit={(event) => {
            event.preventDefault();
            setValue(habit, day, draft);
          }}
        >
          <input
            aria-label={habit.name}
            inputMode="decimal"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            style={{ width: 96, fontSize: 16, padding: 10, borderRadius: 12, border: '1px solid var(--line)', background: 'var(--bg)' }}
          />
          <button className="btn" type="submit">Save</button>
        </form>
      )}
    </li>
  );
}

export function HabitsScreen() {
  const today = todayISO();
  const data = useData();
  const due = data.activeHabits.filter((habit) => isDue(habit, today));
  const [name, setName] = useState('');
  const [kind, setKind] = useState('check');
  const [target, setTarget] = useState('');
  const [unit, setUnit] = useState('');

  return (
    <div className="board">
      <section>
        {due.length === 0 ? (
          <p className="quiet">Nothing due today.</p>
        ) : (
          <ul className="food-list">
            {due.map((habit) => <HabitRow key={habit.id} habit={habit} day={today} />)}
          </ul>
        )}
      </section>

      <details className="fold">
        <summary>Edit habits</summary>
        <ul className="food-list">
          {data.activeHabits.map((habit) => (
            <li key={habit.id}>
              <span>{habit.name}</span>
              <button type="button" className="text-btn" onClick={() => data.deleteHabit(habit.id)}>Remove</button>
            </li>
          ))}
        </ul>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim()) return;
            data.addHabit({
              name,
              kind,
              target: kind === 'check' ? null : Number(target) || 1,
              unit,
            });
            setName('');
            setTarget('');
            setUnit('');
          }}
        >
          <label className="field"><span>Name</span><input value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label className="field">
            <span>Kind</span>
            <select value={kind} onChange={(event) => setKind(event.target.value)}>
              <option value="check">Done or not</option>
              <option value="count">Count</option>
              <option value="amount">Amount</option>
              <option value="measure">Measure</option>
            </select>
          </label>
          {kind !== 'check' && (
            <label className="field"><span>Target</span><input inputMode="decimal" value={target} onChange={(event) => setTarget(event.target.value)} /></label>
          )}
          <label className="field"><span>Unit</span><input value={unit} onChange={(event) => setUnit(event.target.value)} placeholder="g, min, walks" /></label>
          <div className="btn-row"><button className="btn" type="submit">Add habit</button></div>
        </form>
      </details>
    </div>
  );
}
