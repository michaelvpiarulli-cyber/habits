import { useEffect, useMemo, useState } from 'react';
import { useData } from '../context/DataProvider';
import { useLife } from '../context/LifeProvider';
import { addDays, formatLong, startOfWeek, todayISO } from '../lib/dates';
import { daysWithLoggedFood } from '../lib/foodGoals';
import { HABIT_COLORS, HABIT_ICONS, colorForHabit, iconForHabit } from '../lib/habitIcons';
import { groupByDaypart, isComplete, isFoodTrackingHabit, targetOf, valueOf } from '../lib/habits';
import { currentStreak } from '../lib/streaks';
import { HabitMark } from './HabitMark';

function WeekDots({ habit, done, today }) {
  const start = startOfWeek(today);
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));
  const streak = currentStreak(habit, done, today);
  const filled = days.filter((day) => done.has(day)).length;
  return (
    <span className="habit-week" aria-label={`Streak ${streak}. This week ${filled} of 7.`}>
      {streak > 0 ? <span className="habit-streak">{streak}</span> : null}
      <span className="habit-dots" aria-hidden="true">
        {days.map((day) => {
          const on = done.has(day);
          const mark = day === today;
          return <span key={day} className={[on ? 'is-on' : '', mark ? 'is-today' : ''].filter(Boolean).join(' ')} />;
        })}
      </span>
    </span>
  );
}

function ValueEntry({ habit, day, value }) {
  const { setValue } = useData();
  const [draft, setDraft] = useState(value ? String(value) : '');
  useEffect(() => {
    setDraft(value ? String(value) : '');
  }, [value]);

  const commit = () => {
    const next = draft.trim();
    const amount = next === '' ? 0 : Number(next);
    if (!Number.isFinite(amount) || amount === value) return;
    setValue(habit, day, amount);
  };

  return (
    <span className="habit-entry">
      <input
        aria-label={habit.name}
        inputMode="decimal"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
      />
      {habit.unit ? <span className="habit-unit">{habit.unit}</span> : null}
    </span>
  );
}

function IconPicker({ habit, onIcon, onColor }) {
  const icon = iconForHabit(habit);
  const color = colorForHabit(habit);
  return (
    <div className="habit-picker">
      <div className="habit-icon-grid" role="group" aria-label={`Icon for ${habit.name}`}>
        {HABIT_ICONS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`habit-badge tone-${color}${icon === key ? ' is-on' : ''}`}
            aria-label={label}
            aria-pressed={icon === key}
            onClick={() => onIcon(key)}
          >
            <HabitMark habit={{ icon: key }} bare />
          </button>
        ))}
      </div>
      <div className="habit-color-grid" role="group" aria-label={`Color for ${habit.name}`}>
        {HABIT_COLORS.map((key) => (
          <button
            key={key}
            type="button"
            className={`habit-swatch tone-${key}${color === key ? ' is-on' : ''}`}
            aria-label={key}
            aria-pressed={color === key}
            onClick={() => onColor(key)}
          />
        ))}
      </div>
    </div>
  );
}

function HabitRow({ habit, day, editing, picking, onPick, onIcon, onColor, onRename, onMove, canUp, canDown, onRemove, foodDays }) {
  const { logFor, toggleDay, bumpDay, doneSetFor } = useData();
  const log = logFor(habit.id, day);
  const value = valueOf(habit, log);
  const fromFood = isFoodTrackingHabit(habit);
  const complete = isComplete(habit, log) || (fromFood && foodDays.has(day));
  const done = fromFood ? new Set([...doneSetFor(habit.id), ...foodDays]) : doneSetFor(habit.id);
  const numeric = habit.kind === 'amount' || habit.kind === 'measure';
  const [name, setName] = useState(habit.name);
  useEffect(() => {
    setName(habit.name);
  }, [habit.name]);

  const tap = () => {
    if (habit.kind === 'count') bumpDay(habit, day);
    else toggleDay(habit, day);
  };

  return (
    <li className={`habit-row${complete ? ' is-done' : ''}`}>
      <div className="habit-main">
        {editing ? (
          <>
            <button type="button" aria-label={`Move ${habit.name} up`} disabled={!canUp} onClick={() => onMove(-1)}>Up</button>
            <button type="button" aria-label={`Move ${habit.name} down`} disabled={!canDown} onClick={() => onMove(1)}>Down</button>
          </>
        ) : null}
        <HabitMark habit={habit} onClick={editing ? onPick : undefined} pressed={picking} />
        {editing ? (
          <input
            className="habit-rename"
            aria-label={`Rename ${habit.name}`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={() => {
              const next = name.trim();
              if (next && next !== habit.name) onRename(next);
            }}
          />
        ) : (
          <span className="habit-name">{habit.name}</span>
        )}
        {editing ? null : <WeekDots habit={habit} done={done} today={day} />}
        {editing ? (
          <button type="button" className="habit-remove" onClick={onRemove}>Remove</button>
        ) : numeric ? (
          <ValueEntry habit={habit} day={day} value={value} />
        ) : (
          <button type="button" className={`check habit-tap${complete ? ' is-done' : ''}`} aria-label={habit.name} onClick={tap}>
            <span className="box" aria-hidden="true">{habit.kind === 'count' && value > 0 && value < targetOf(habit) ? value : ''}</span>
          </button>
        )}
      </div>
      {picking ? <IconPicker habit={habit} onIcon={onIcon} onColor={onColor} /> : null}
    </li>
  );
}

function AddHabit({ onAdd }) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState('check');
  const [target, setTarget] = useState('');
  const [unit, setUnit] = useState('');

  return (
    <form
      className="habit-add"
      onSubmit={(event) => {
        event.preventDefault();
        if (!name.trim()) return;
        onAdd({
          name,
          kind,
          target: kind === 'check' ? null : Number(target) || 1,
          unit,
        });
        setName('');
        setTarget('');
        setUnit('');
        setKind('check');
      }}
    >
      <input aria-label="Habit name" value={name} onChange={(event) => setName(event.target.value)} />
      <select aria-label="Kind" value={kind} onChange={(event) => setKind(event.target.value)}>
        <option value="check">Check</option>
        <option value="count">Count</option>
        <option value="amount">Amount</option>
        <option value="measure">Measure</option>
      </select>
      {kind !== 'check' ? (
        <input aria-label="Target" inputMode="decimal" value={target} onChange={(event) => setTarget(event.target.value)} />
      ) : null}
      {kind !== 'check' ? (
        <input aria-label="Unit" value={unit} onChange={(event) => setUnit(event.target.value)} />
      ) : null}
      <button className="btn" type="submit">Add</button>
    </form>
  );
}

export function HabitsScreen() {
  const today = todayISO();
  const data = useData();
  const { dailyNutrition } = useLife();
  const habits = data.activeHabits;
  const groups = groupByDaypart(habits);
  const [editing, setEditing] = useState(false);
  const [picking, setPicking] = useState(null);
  const foodDays = useMemo(
    () => daysWithLoggedFood(dailyNutrition, data.snapshot().nutrition),
    [dailyNutrition, data]
  );
  const done = habits.filter((habit) => (
    isComplete(habit, data.logFor(habit.id, today)) || (isFoodTrackingHabit(habit) && foodDays.has(today))
  )).length;
  const ratio = habits.length ? Math.round((done / habits.length) * 100) : 0;

  const reorder = (habit, delta) => {
    const index = habits.findIndex((item) => item.id === habit.id);
    const to = index + delta;
    if (index < 0 || to < 0 || to >= habits.length) return;
    const next = habits.slice();
    const [item] = next.splice(index, 1);
    next.splice(to, 0, item);
    next.forEach((row, position) => {
      if (row.sortOrder !== position) data.updateHabit(row.id, { sortOrder: position });
    });
  };

  return (
    <div className="habit-page">
      <div className="habit-tools">
        <div className="habit-head">
          <p>{formatLong(today)}</p>
          <p className="habit-count">{done} of {habits.length} done</p>
        </div>
        <button type="button" aria-pressed={editing} onClick={() => { setEditing((value) => !value); setPicking(null); }}>
          {editing ? 'Done' : 'Edit'}
        </button>
      </div>
      <div className="meter habit-meter" aria-hidden="true">
        <span style={{ width: `${ratio}%` }} />
      </div>
      {groups.map((group) => (
        <section key={group.id}>
          {group.label ? <h2>{group.label}</h2> : null}
          <ul className="habit-list">
            {group.habits.map((habit) => {
              const index = habits.findIndex((item) => item.id === habit.id);
              return (
                <HabitRow
                  key={habit.id}
                  habit={habit}
                  day={today}
                  editing={editing}
                  picking={picking === habit.id}
                  canUp={index > 0}
                  canDown={index < habits.length - 1}
                  onPick={() => setPicking((current) => (current === habit.id ? null : habit.id))}
                  onIcon={(icon) => data.updateHabit(habit.id, { icon })}
                  onColor={(color) => data.updateHabit(habit.id, { color })}
                  onRename={(name) => data.updateHabit(habit.id, { name })}
                  onMove={(delta) => reorder(habit, delta)}
                  onRemove={() => data.deleteHabit(habit.id)}
                  foodDays={foodDays}
                />
              );
            })}
          </ul>
        </section>
      ))}
      {editing ? <AddHabit onAdd={data.addHabit} /> : null}
    </div>
  );
}
