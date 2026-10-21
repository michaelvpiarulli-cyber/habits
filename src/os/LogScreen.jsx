import { useState } from 'react';
import { useLife } from '../context/LifeProvider';
import { todayISO } from '../lib/dates';

const EMPTY = { title: '', link: '', watchedOn: todayISO(), rating: '', notes: '' };

export function LogScreen() {
  const today = todayISO();
  const life = useLife();
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const watches = life.watches.filter((entry) => !entry.deleted);

  const saveWatch = (event) => {
    event.preventDefault();
    const payload = { ...form, rating: form.rating === '' ? null : Number(form.rating) };
    const result = editing ? life.updateWatch(editing, payload) : life.addWatch(payload);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setError('');
    setEditing(null);
    setForm(EMPTY);
  };

  return (
    <div className="board">
      {watches.length > 0 && (
        <ul className="food-list">
          {watches.map((entry) => (
            <li key={entry.id}>
              <div>
                <strong>{entry.title}</strong>
                <div className="faint">{entry.watchedOn || 'No date'}{entry.rating ? ` · ${entry.rating} / 5` : ''}</div>
                {entry.notes ? <div className="quiet">{entry.notes}</div> : null}
                <div className="btn-row">
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => {
                      setEditing(entry.id);
                      setForm({
                        title: entry.title || '',
                        link: entry.link || '',
                        watchedOn: entry.watchedOn || today,
                        rating: entry.rating || '',
                        notes: entry.notes || '',
                      });
                    }}
                  >
                    Edit
                  </button>
                  <button type="button" className="btn danger" onClick={() => life.deleteWatch(entry.id)}>Delete</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={saveWatch}>
        <label className="field"><span>{editing ? 'Edit entry' : 'What did you watch'}</span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
        <label className="field"><span>Link</span><input value={form.link} onChange={(event) => setForm({ ...form, link: event.target.value })} placeholder="https://" /></label>
        <label className="field"><span>Date</span><input type="date" value={form.watchedOn} onChange={(event) => setForm({ ...form, watchedOn: event.target.value })} /></label>
        <div className="field">
          <span>Rating</span>
          <div className="stars">
            {[1, 2, 3, 4, 5].map((score) => (
              <button key={score} type="button" className={Number(form.rating) >= score ? 'is-on' : ''} onClick={() => setForm({ ...form, rating: score })}>{score}</button>
            ))}
          </div>
        </div>
        <label className="field"><span>Notes</span><textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
        {error ? <p className="error">{error}</p> : null}
        <div className="btn-row">
          <button className="btn" type="submit">{editing ? 'Update' : 'Save'}</button>
          {editing && <button className="btn secondary" type="button" onClick={() => { setEditing(null); setForm(EMPTY); setError(''); }}>Cancel</button>}
        </div>
      </form>
    </div>
  );
}
