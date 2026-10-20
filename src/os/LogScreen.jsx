import { useState } from 'react';
import { useData } from '../context/DataProvider';
import { useLife } from '../context/LifeProvider';
import { todayISO } from '../lib/dates';
import { Collection } from '../shell/Collection';

const EMPTY = { title: '', link: '', watchedOn: todayISO(), rating: '', notes: '' };

export function LogScreen({ onClose }) {
  const today = todayISO();
  const { noteFor, setDayNote } = useData();
  const life = useLife();
  const [journal, setJournal] = useState(() => noteFor(today));
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

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
    <main className="os-scroll">
      <header className="os-head">
        <div>
          <p className="os-kicker">Journal</p>
          <h1 className="os-title">Log</h1>
        </div>
        <button type="button" className="text-btn" onClick={onClose}>Done</button>
      </header>
      <div className="board">
      <section className="card">
        <h2>Today</h2>
        <label className="field">
          <span>A line about the day</span>
          <textarea
            value={journal}
            onChange={(event) => setJournal(event.target.value)}
            onBlur={() => setDayNote(today, journal)}
          />
        </label>
      </section>

      <Collection
        title="Watch log"
        groupKey="status"
        rows={life.watches.filter((entry) => !entry.deleted).map((entry) => ({
          id: entry.id,
          title: entry.title,
          status: entry.rating ? 'Rated' : 'Logged',
          date: entry.watchedOn || '',
          rating: entry.rating ? String(entry.rating) : '',
          tags: 'Watch',
        }))}
        columns={[
          { key: 'title', label: 'Name', kind: 'title' },
          { key: 'status', label: 'Status', kind: 'status', options: ['Logged', 'Rated'] },
          { key: 'date', label: 'Date', kind: 'date' },
          { key: 'rating', label: 'Rating', kind: 'rating', options: ['1', '2', '3', '4', '5'] },
          { key: 'tags', label: 'Tags', kind: 'tags' },
        ]}
        onAdd={(title) => life.addWatch({ title, watchedOn: today })}
        onUpdate={(id, patch) => {
          const current = life.watches.find((entry) => entry.id === id);
          if (!current) return;
          const next = {};
          if (patch.title != null) next.title = patch.title;
          if (patch.date != null) next.watchedOn = patch.date || null;
          if (patch.rating != null) next.rating = patch.rating ? Number(patch.rating) : null;
          if (patch.status === 'Logged') next.rating = null;
          life.updateWatch(id, next);
        }}
      />

      <section className="card">
        <div className="card-head"><h2>Watch details</h2></div>
        <ul className="food-list">
          {life.watches.length === 0 ? <li className="quiet">Nothing saved.</li> : life.watches.map((entry) => (
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
      </section>
      </div>
    </main>
  );
}
