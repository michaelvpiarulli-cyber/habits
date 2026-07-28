import { useEffect, useState } from 'react';
import { useData } from '../context/DataProvider';

/**
 * My virtues and values.
 *
 * Deliberately not tracked. Habits get streaks and completion rates because
 * they are discrete acts; a value is a direction, and scoring yourself daily
 * on "was I patient" turns character into a scoreboard you eventually start
 * gaming. So this place is for writing them down and re-reading them — and the
 * one on Today rotates so the whole list comes round instead of becoming
 * wallpaper.
 */
function VirtueForm({ virtue, onSave, onClose }) {
  const [name, setName] = useState(virtue?.name || '');
  const [note, setNote] = useState(virtue?.note || '');

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const canSave = name.trim().length > 0;

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label={virtue ? 'Edit value' : 'New value'}>
      <button type="button" className="sheet__scrim" onClick={onClose} aria-label="Close" />
      <form
        className="sheet__panel"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSave) onSave({ name: name.trim(), note: note.trim() });
        }}
      >
        <header className="sheet__head">
          <h2 className="sheet__title">{virtue ? 'Edit value' : 'New value'}</h2>
          <button type="button" className="sheet__close" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="sheet__body">
          <div className="field">
            <label className="field__label" htmlFor="virtue-name">
              The value
            </label>
            <input
              id="virtue-name"
              className="field__input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Presence"
              autoFocus
              maxLength={60}
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="virtue-note">
              What it means in practice
            </label>
            <textarea
              id="virtue-note"
              className="field__input field__input--area"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder="Write it as something you can actually do, not a mood."
            />
            <p className="field__hint">
              The specific version is the one that changes a decision. “Be a good dad” is a wish;
              “phone in the drawer from dinner until bedtime” is a value you can keep.
            </p>
          </div>
        </div>

        <footer className="sheet__foot">
          <button type="submit" className="btn btn--primary" disabled={!canSave}>
            {virtue ? 'Save changes' : 'Add value'}
          </button>
        </footer>
      </form>
    </div>
  );
}

export function ValuesView() {
  const { virtues, addVirtue, updateVirtue, deleteVirtue, virtueOfDay } = useData();
  const [editing, setEditing] = useState(null);

  const save = (fields) => {
    if (editing === 'new') addVirtue(fields);
    else updateVirtue(editing.id, fields);
    setEditing(null);
  };

  return (
    <div className="view">
      <header className="view__head view__head--row">
        <div>
          <p className="eyebrow">{virtues.length ? `${virtues.length} written down` : 'Not yet written'}</p>
          <h1 className="view__title">My virtues and values</h1>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setEditing('new')}>
          Add
        </button>
      </header>

      {virtues.length === 0 ? (
        <div className="empty">
          <p className="empty__title">Nothing here yet.</p>
          <p className="empty__body">
            Habits are what you do. These are what you’re trying to be. Write a few in your own
            words — one of them shows up on Today each morning.
          </p>
        </div>
      ) : (
        <ol className="virtues">
          {virtues.map((v) => (
            <li key={v.id} className={`virtue ${virtueOfDay?.id === v.id ? 'is-today' : ''}`}>
              <div className="virtue__head">
                <h2 className="virtue__name">{v.name}</h2>
                {virtueOfDay?.id === v.id && <span className="virtue__flag">Today</span>}
              </div>
              {v.note && <p className="virtue__note">{v.note}</p>}
              <div className="virtue__actions">
                <button type="button" className="chip" onClick={() => setEditing(v)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="chip chip--danger"
                  onClick={() => window.confirm(`Remove “${v.name}”?`) && deleteVirtue(v.id)}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}

      {editing && (
        <VirtueForm
          virtue={editing === 'new' ? null : editing}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
