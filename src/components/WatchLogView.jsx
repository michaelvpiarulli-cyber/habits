import { useState } from 'react';
import { useLife } from '../context/LifeProvider';
import { todayISO } from '../lib/dates';
import { recentWatches } from '../lib/watchLog';

const EMPTY = {
  title: '',
  link: '',
  watchedOn: '',
  rating: '',
  notes: '',
};

function StarPicker({ value, onChange }) {
  return (
    <div className="stars" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`star ${Number(value) >= star ? 'is-on' : ''}`}
          aria-checked={Number(value) === star}
          role="radio"
          onClick={() => onChange(star)}
        >
          {star}
        </button>
      ))}
    </div>
  );
}

export function WatchLogView() {
  const { watches, addWatch, updateWatch, deleteWatch } = useLife();
  const [draft, setDraft] = useState({ ...EMPTY, watchedOn: todayISO() });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const entries = recentWatches(watches, 100);

  const setField = (key, value) => setDraft((current) => ({ ...current, [key]: value }));

  const reset = () => {
    setEditingId(null);
    setDraft({ ...EMPTY, watchedOn: todayISO() });
    setError('');
  };

  const save = (event) => {
    event.preventDefault();
    const payload = {
      ...draft,
      rating: draft.rating === '' ? null : Number(draft.rating),
      watchedOn: draft.watchedOn || null,
    };
    const result = editingId ? updateWatch(editingId, payload) : addWatch(payload);
    if (result?.error) {
      setError(result.error);
      return;
    }
    reset();
  };

  const edit = (entry) => {
    setEditingId(entry.id);
    setError('');
    setDraft({
      title: entry.title || '',
      link: entry.link || '',
      watchedOn: entry.watchedOn || '',
      rating: entry.rating || '',
      notes: entry.notes || '',
    });
  };

  const remove = (entry) => {
    if (typeof window !== 'undefined' && !window.confirm(`Delete “${entry.title}”?`)) return;
    deleteWatch(entry.id);
    if (editingId === entry.id) reset();
  };

  return (
    <div className="view">
      <header className="view__head">
        <p className="eyebrow">Watch log</p>
        <h2 className="view__title">{editingId ? 'Edit entry' : 'Add a video'}</h2>
      </header>

      <form className="os-form" onSubmit={save}>
        {error && <p className="note note--bad">{error}</p>}
        <label className="field">
          <span className="field__label">Title</span>
          <input
            className="field__input"
            value={draft.title}
            onChange={(event) => setField('title', event.target.value)}
            required
          />
        </label>
        <label className="field">
          <span className="field__label">Link</span>
          <input
            className="field__input"
            type="url"
            inputMode="url"
            placeholder="https://"
            value={draft.link}
            onChange={(event) => setField('link', event.target.value)}
          />
        </label>
        <label className="field">
          <span className="field__label">Date watched</span>
          <input
            className="field__input"
            type="date"
            value={draft.watchedOn}
            onChange={(event) => setField('watchedOn', event.target.value)}
          />
        </label>
        <div className="field">
          <span className="field__label">Rating</span>
          <StarPicker value={draft.rating} onChange={(star) => setField('rating', star)} />
        </div>
        <label className="field">
          <span className="field__label">Notes</span>
          <textarea
            className="field__input field__input--area"
            rows={3}
            value={draft.notes}
            onChange={(event) => setField('notes', event.target.value)}
          />
        </label>
        <div className="os-form__actions">
          <button type="submit" className="btn btn--primary">
            {editingId ? 'Save' : 'Add'}
          </button>
          {editingId && (
            <button type="button" className="text-btn" onClick={reset}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <section className="section">
        <h3 className="os-card__title">Recent</h3>
        {entries.length === 0 ? (
          <p className="os-card__meta">Nothing here yet.</p>
        ) : (
          <ul className="os-list os-list--entries">
            {entries.map((entry) => (
              <li key={entry.id}>
                <div>
                  {entry.link ? (
                    <a href={entry.link} target="_blank" rel="noreferrer">
                      {entry.title}
                    </a>
                  ) : (
                    <strong>{entry.title}</strong>
                  )}
                  <p className="os-card__meta">
                    {entry.watchedOn || 'No date'}
                    {entry.rating ? ` · ${entry.rating}/5` : ''}
                    {entry.notes ? ` · ${entry.notes}` : ''}
                  </p>
                </div>
                <div className="os-form__actions">
                  <button type="button" className="text-btn" onClick={() => edit(entry)}>
                    Edit
                  </button>
                  <button type="button" className="text-btn" onClick={() => remove(entry)}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
