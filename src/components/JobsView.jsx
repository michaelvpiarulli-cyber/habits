import { useState } from 'react';
import { useLife } from '../context/LifeProvider';
import { useGoogle } from '../context/GoogleProvider';
import { relativeDay, todayISO } from '../lib/dates';
import { JOB_ACTIVE, JOB_STATUSES, labelOf } from '../lib/life';
import { FormSheet } from './FormSheet';
import { GoogleConnect } from './GoogleConnect';

function JobForm({ job, onSave, onClose }) {
  const google = useGoogle();
  const [form, setForm] = useState(() => ({
    company: job?.company || '',
    role: job?.role || '',
    status: job?.status || 'saved',
    url: job?.url || '',
    location: job?.location || '',
    salary: job?.salary || '',
    appliedOn: job?.appliedOn || '',
    dueDate: job?.dueDate || '',
    notes: job?.notes || '',
    addToGoogle: false,
  }));
  const set = (patch) => setForm((current) => ({ ...current, ...patch }));

  return (
    <FormSheet title={job ? 'Edit application' : 'New application'} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.company.trim() || !form.role.trim()) return;
          onSave(form);
        }}
      >
        <div className="field">
          <label className="field__label" htmlFor="job-company">
            Company
          </label>
          <input
            id="job-company"
            className="field__input"
            value={form.company}
            onChange={(e) => set({ company: e.target.value })}
            autoFocus
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="job-role">
            Role
          </label>
          <input
            id="job-role"
            className="field__input"
            value={form.role}
            onChange={(e) => set({ role: e.target.value })}
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="job-status">
            Status
          </label>
          <select
            id="job-status"
            className="field__input"
            value={form.status}
            onChange={(e) => set({ status: e.target.value })}
          >
            {JOB_STATUSES.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="field field--split">
          <label className="field__label" htmlFor="job-applied">
            Applied
          </label>
          <input
            id="job-applied"
            className="field__input"
            type="date"
            value={form.appliedOn || ''}
            onChange={(e) => set({ appliedOn: e.target.value })}
          />
          <label className="field__label" htmlFor="job-due">
            Follow up
          </label>
          <input
            id="job-due"
            className="field__input"
            type="date"
            value={form.dueDate || ''}
            onChange={(e) => set({ dueDate: e.target.value })}
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="job-url">
            Link
          </label>
          <input
            id="job-url"
            className="field__input"
            value={form.url}
            onChange={(e) => set({ url: e.target.value })}
            placeholder="https://"
          />
        </div>
        <div className="field field--split">
          <label className="field__label" htmlFor="job-location">
            Location
          </label>
          <input
            id="job-location"
            className="field__input"
            value={form.location}
            onChange={(e) => set({ location: e.target.value })}
          />
          <label className="field__label" htmlFor="job-salary">
            Pay
          </label>
          <input
            id="job-salary"
            className="field__input"
            value={form.salary}
            onChange={(e) => set({ salary: e.target.value })}
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="job-notes">
            Notes
          </label>
          <textarea
            id="job-notes"
            className="field__input field__input--area"
            rows={3}
            value={form.notes}
            onChange={(e) => set({ notes: e.target.value })}
          />
        </div>
        {form.dueDate && (
          <label className="check">
            <input
              type="checkbox"
              checked={form.addToGoogle}
              onChange={(e) => set({ addToGoogle: e.target.checked })}
            />
            <span>Add follow-up to Google Calendar</span>
          </label>
        )}
        {form.addToGoogle && !google.connected && <GoogleConnect compact />}
        <button
          type="submit"
          className="btn btn--primary"
          disabled={!form.company.trim() || !form.role.trim()}
        >
          Save
        </button>
      </form>
    </FormSheet>
  );
}

export function JobsView() {
  const { jobs, addJob, updateJob, deleteJob } = useLife();
  const google = useGoogle();
  const [filter, setFilter] = useState('active');
  const [editing, setEditing] = useState(null);
  const [googleNote, setGoogleNote] = useState('');
  const today = todayISO();

  const visible = jobs.filter((job) => {
    if (filter === 'active') return JOB_ACTIVE.has(job.status);
    if (filter === 'all') return true;
    return job.status === filter;
  });

  const save = async (form) => {
    let googleEventId = editing?.googleEventId || '';
    setGoogleNote('');
    if (form.addToGoogle && form.dueDate) {
      try {
        if (!google.connected) await google.connect();
        const created = await google.addToCalendar({
          title: `${form.company.trim()} · ${form.role.trim()}`,
          day: form.dueDate,
          allDay: true,
          notes: form.notes,
        });
        googleEventId = created.id;
      } catch (err) {
        setGoogleNote(err.message || 'Saved the application, but Google Calendar did not accept it.');
      }
    }
    const fields = {
      company: form.company.trim(),
      role: form.role.trim(),
      status: form.status,
      url: form.url.trim(),
      location: form.location.trim(),
      salary: form.salary.trim(),
      appliedOn: form.appliedOn || (form.status === 'applied' ? today : null),
      dueDate: form.dueDate || null,
      notes: form.notes,
      googleEventId,
    };
    if (editing?.id) updateJob(editing.id, fields);
    else addJob(fields);
    setEditing(null);
  };

  return (
    <div className="view">
      <header className="view__head view__head--row">
        <div>
          <p className="eyebrow">Applications</p>
          <h1 className="view__title">Jobs</h1>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setEditing({})}>
          New
        </button>
      </header>

      {googleNote && <p className="note note--bad">{googleNote}</p>}

      <div className="filter-row">
        {[['active', 'Active'], ['all', 'All'], ...JOB_STATUSES].map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`chip ${filter === id ? 'is-on' : ''}`}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="empty">
          <p className="empty__title">No applications here</p>
          <p className="empty__body">Track the role, the status, and a follow-up date.</p>
        </div>
      ) : (
        <ul className="cards">
          {visible.map((job) => (
            <li key={job.id} className="card">
              <p className="card__name">{job.role}</p>
              <p className="card__meta">
                {job.company} · {labelOf(JOB_STATUSES, job.status)}
                {job.location ? ` · ${job.location}` : ''}
              </p>
              {job.dueDate && (
                <p className={`card__meta ${job.dueDate < today ? 'is-overdue' : ''}`}>
                  Follow up {relativeDay(job.dueDate)}
                </p>
              )}
              <div className="goal__actions">
                {job.url && (
                  <a className="chip" href={job.url} target="_blank" rel="noreferrer">
                    Listing
                  </a>
                )}
                <button type="button" className="chip" onClick={() => setEditing(job)}>
                  Edit
                </button>
                <button type="button" className="chip chip--danger" onClick={() => deleteJob(job.id)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <JobForm job={editing.id ? editing : null} onSave={save} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
