import { useEffect, useMemo, useRef, useState } from 'react';
import { useLife } from '../context/LifeProvider';
import { useData } from '../context/DataProvider';
import { relativeDay } from '../lib/dates';
import { isNoteEmpty, noteSnippet, noteTitle } from '../lib/notes';

/**
 * Notion-quiet notes: a list of pages, then a full-bleed page with a large
 * title and a calm body. Saves on blur / short debounce — no Save button
 * choreography.
 */
function NoteEditor({ note, onChange, onClose, onDelete, onTogglePin }) {
  const [title, setTitle] = useState(note.title || '');
  const [body, setBody] = useState(note.body || '');
  const titleRef = useRef(null);
  const bodyRef = useRef(null);
  const pending = useRef(null);
  const latest = useRef({ title, body });
  latest.current = { title, body };

  useEffect(() => {
    setTitle(note.title || '');
    setBody(note.body || '');
  }, [note.id, note.title, note.body]);

  useEffect(() => {
    if (!(note.title || '').trim()) {
      requestAnimationFrame(() => titleRef.current?.focus());
    } else {
      requestAnimationFrame(() => bodyRef.current?.focus());
    }
  }, [note.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const flush = () => {
    clearTimeout(pending.current);
    const next = latest.current;
    if (next.title !== (note.title || '') || next.body !== (note.body || '')) {
      onChange({ title: next.title, body: next.body });
    }
  };

  const schedule = (patch) => {
    latest.current = { ...latest.current, ...patch };
    clearTimeout(pending.current);
    pending.current = setTimeout(flush, 450);
  };

  useEffect(() => () => flush(), [note.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="note-page">
      <header className="note-page__bar">
        <button
          type="button"
          className="text-btn"
          onClick={() => {
            flush();
            onClose();
          }}
        >
          ← Notes
        </button>
        <div className="note-page__actions">
          <button type="button" className="text-btn" onClick={onTogglePin} aria-pressed={!!note.pinned}>
            {note.pinned ? 'Unpin' : 'Pin'}
          </button>
          <button
            type="button"
            className="text-btn text-btn--danger"
            onClick={() => {
              if (window.confirm(`Delete “${noteTitle(note)}”?`)) onDelete();
            }}
          >
            Delete
          </button>
        </div>
      </header>

      <div className="note-page__sheet">
        <input
          ref={titleRef}
          className="note-page__title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            schedule({ title: e.target.value });
          }}
          onBlur={flush}
          placeholder="Untitled"
          aria-label="Note title"
        />
        <textarea
          ref={bodyRef}
          className="note-page__body"
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            schedule({ body: e.target.value });
          }}
          onBlur={flush}
          placeholder="Write something…"
          aria-label="Note body"
          rows={14}
        />
      </div>
    </div>
  );
}

export function NotesView({ initialNoteId = null, onEditingChange, onLeaveEditor }) {
  const { notes, addNote, updateNote, deleteNote } = useLife();
  const { notes: dayNotes } = useData();
  const [openId, setOpenId] = useState(initialNoteId);
  const open = useMemo(() => notes.find((n) => n.id === openId) || null, [notes, openId]);

  useEffect(() => {
    if (initialNoteId) setOpenId(initialNoteId);
  }, [initialNoteId]);

  useEffect(() => {
    onEditingChange?.(Boolean(open));
  }, [open, onEditingChange]);

  const closeEditor = () => {
    if (open && isNoteEmpty(open)) deleteNote(open.id);
    setOpenId(null);
    onLeaveEditor?.();
  };

  const create = () => {
    const note = addNote({ title: '', body: '' });
    setOpenId(note.id);
  };

  if (open) {
    return (
      <NoteEditor
        note={open}
        onChange={(patch) => updateNote(open.id, patch)}
        onClose={closeEditor}
        onDelete={() => {
          deleteNote(open.id);
          setOpenId(null);
          onLeaveEditor?.();
        }}
        onTogglePin={() => updateNote(open.id, { pinned: !open.pinned })}
      />
    );
  }

  return (
    <div className="view">
      <header className="view__head view__head--row">
        <div>
          <p className="eyebrow">{notes.length ? `${notes.length} pages` : 'Notebook'}</p>
          <h1 className="view__title">Notes</h1>
        </div>
        <button type="button" className="text-btn" onClick={create}>
          New
        </button>
      </header>

      {notes.length === 0 && (
        <div className="empty">
          <p className="empty__title">A quiet page.</p>
          <p className="empty__body">
            Capture plans, sermons, travel, or anything that does not belong on Today. Title at the
            top, words underneath — that is the whole editor.
          </p>
          <button type="button" className="btn btn--primary" onClick={create}>
            New note
          </button>
        </div>
      )}

      {notes.length > 0 && (
        <ul className="page-list" aria-label="Notes">
          {notes.map((note) => (
            <li key={note.id}>
              <button type="button" className="page-row" onClick={() => setOpenId(note.id)}>
                <span className="page-row__mark" aria-hidden="true">
                  {note.pinned ? '◆' : '○'}
                </span>
                <span className="page-row__copy">
                  <span className="page-row__title">{noteTitle(note)}</span>
                  {(noteSnippet(note.body) || note.updatedAt) && (
                    <span className="page-row__meta">
                      {noteSnippet(note.body) || relativeDay(note.updatedAt?.slice(0, 10))}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {dayNotes?.length > 0 && (
        <section className="section life-section">
          <h2 className="eyebrow">Day notes</h2>
          <p className="section__note">Reflections written on Today stay with their day.</p>
          <ul className="page-list page-list--quiet">
            {dayNotes.slice(0, 8).map((n) => (
              <li key={n.id}>
                <div className="page-row page-row--static">
                  <span className="page-row__mark" aria-hidden="true">
                    ·
                  </span>
                  <span className="page-row__copy">
                    <span className="page-row__title">{relativeDay(n.day)}</span>
                    <span className="page-row__meta">{noteSnippet(n.text)}</span>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
