import { useState } from 'react';
import { useData } from '../context/DataProvider';
import { describeCadence, describeTarget } from '../lib/habits';
import { HabitEditor } from './HabitEditor';

function HabitLine({ habit, onEdit, onArchive }) {
  const target = describeTarget(habit);

  return (
    <li className="line">
      <button type="button" className="line__body" onClick={onEdit}>
        <span className="line__name">
          {habit.emoji && <span aria-hidden="true">{habit.emoji} </span>}
          {habit.name}
        </span>
        <span className="line__meta">
          {describeCadence(habit)}
          {target ? ` · ${target}` : ''}
        </span>
      </button>
      <button type="button" className="line__action" onClick={onArchive}>
        {habit.archived ? 'Restore' : 'Archive'}
      </button>
    </li>
  );
}

export function HabitsView() {
  const { activeHabits, archivedHabits, addHabit, updateHabit, deleteHabit } = useData();
  const [editing, setEditing] = useState(null); // habit object, or 'new'

  const close = () => setEditing(null);

  const save = (fields) => {
    if (editing === 'new') addHabit(fields);
    else updateHabit(editing.id, fields);
    close();
  };

  const remove = () => {
    if (editing !== 'new' && window.confirm(`Delete “${editing.name}” and its history?`)) {
      deleteHabit(editing.id);
      close();
    }
  };

  return (
    <div className="view">
      <header className="view__head view__head--row">
        <div>
          <p className="eyebrow">{activeHabits.length} active</p>
          <h1 className="view__title">Habits</h1>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setEditing('new')}>
          Add habit
        </button>
      </header>

      {activeHabits.length === 0 ? (
        <div className="empty">
          <p className="empty__body">Nothing tracked yet. Add your first habit above.</p>
        </div>
      ) : (
        <ul className="lines">
          {activeHabits.map((h) => (
            <HabitLine
              key={h.id}
              habit={h}
              onEdit={() => setEditing(h)}
              onArchive={() => updateHabit(h.id, { archived: true })}
            />
          ))}
        </ul>
      )}

      {archivedHabits.length > 0 && (
        <section className="section">
          <h2 className="eyebrow">Archived</h2>
          <p className="section__note">
            Kept for the record, off the daily list. Restoring one brings its history back with it.
          </p>
          <ul className="lines lines--muted">
            {archivedHabits.map((h) => (
              <HabitLine
                key={h.id}
                habit={h}
                onEdit={() => setEditing(h)}
                onArchive={() => updateHabit(h.id, { archived: false })}
              />
            ))}
          </ul>
        </section>
      )}

      {editing && (
        <HabitEditor
          habit={editing === 'new' ? null : editing}
          onSave={save}
          onDelete={remove}
          onClose={close}
        />
      )}
    </div>
  );
}
