import { useEffect, useMemo, useRef, useState } from 'react';
import { useLife } from '../context/LifeProvider';
import { useData } from '../context/DataProvider';
import { relativeDay } from '../lib/dates';
import { fileToCoverDataUrl, isCoverDataUrl } from '../lib/covers';
import { isNoteEmpty, noteSnippet, noteTitle } from '../lib/notes';

/**
 * Notion-quiet pages: optional cover image, large title, calm body.
 * Saves on blur / short debounce — no Save button choreography.
 */
function NoteEditor({ note, onChange, onClose, onDelete, onTogglePin }) {
  const [title, setTitle] = useState(note.title || '');
  const [body, setBody] = useState(note.body || '');
  const [coverUrl, setCoverUrl] = useState(note.coverUrl || '');
  const [coverError, setCoverError] = useState('');
  const [coverBusy, setCoverBusy] = useState(false);
  const titleRef = useRef(null);
  const bodyRef = useRef(null);
  const pending = useRef(null);
  const latest = useRef({ title, body, coverUrl });
  latest.current = { title, body, coverUrl };

  useEffect(() => {
    setTitle(note.title || '');
    setBody(note.body || '');
    setCoverUrl(note.coverUrl || '');
  }, [note.id, note.title, note.body, note.coverUrl]);

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
    if (
      next.title !== (note.title || '') ||
      next.body !== (note.body || '') ||
      next.coverUrl !== (note.coverUrl || '')
    ) {
      onChange({ title: next.title, body: next.body, coverUrl: next.coverUrl });
    }
  };

  const schedule = (patch) => {
    latest.current = { ...latest.current, ...patch };
    clearTimeout(pending.current);
    pending.current = setTimeout(flush, 450);
  };

  useEffect(() => () => flush(), [note.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const onCover = async (file) => {
    if (!file) return;
    setCoverBusy(true);
    setCoverError('');
    try {
      const next = await fileToCoverDataUrl(file);
      setCoverUrl(next);
      schedule({ coverUrl: next });
      flush();
    } catch (err) {
      setCoverError(err?.message || 'Could not use that image.');
    } finally {
      setCoverBusy(false);
    }
  };

  const hasCover = isCoverDataUrl(coverUrl) || (coverUrl && coverUrl.startsWith('http'));

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
          ← Pages
        </button>
        <div className="note-page__actions">
          <label className={`text-btn ${coverBusy ? 'is-disabled' : ''}`}>
            {coverBusy ? 'Working…' : hasCover ? 'Replace cover' : 'Add cover'}
            <input
              type="file"
              accept="image/*"
              hidden
              disabled={coverBusy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                onCover(file);
              }}
            />
          </label>
          {hasCover && (
            <button
              type="button"
              className="text-btn"
              onClick={() => {
                setCoverUrl('');
                schedule({ coverUrl: '' });
                flush();
              }}
            >
              Remove cover
            </button>
          )}
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

      {hasCover && (
        <div className="note-page__cover" aria-hidden="true">
          <img src={coverUrl} alt="" />
        </div>
      )}
      {coverError && <p className="note note--bad note-page__cover-error">{coverError}</p>}

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
          aria-label="Page title"
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
          aria-label="Page body"
          rows={14}
        />
      </div>
    </div>
  );
}

export function NotesView({
  initialNoteId = null,
  initialCreate = false,
  onEditingChange,
  onLeaveEditor,
  onConsumedIntent,
}) {
  const { notes, addNote, updateNote, deleteNote } = useLife();
  const { notes: dayNotes } = useData();
  const [openId, setOpenId] = useState(initialNoteId);
  const open = useMemo(() => notes.find((n) => n.id === openId) || null, [notes, openId]);

  useEffect(() => {
    if (initialNoteId) setOpenId(initialNoteId);
  }, [initialNoteId]);

  useEffect(() => {
    if (!initialCreate) return;
    const note = addNote({ title: '', body: '' });
    setOpenId(note.id);
    onConsumedIntent?.();
  }, [initialCreate]); // eslint-disable-line react-hooks/exhaustive-deps

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
          <h1 className="view__title">Pages</h1>
        </div>
        <button type="button" className="text-btn" onClick={create}>
          New
        </button>
      </header>

      {notes.length === 0 && (
        <div className="empty">
          <p className="empty__title">Start a page</p>
          <p className="empty__body">
            Plans, lists, or anything beyond the habit loop. Optional cover, title, then words.
          </p>
          <button type="button" className="btn btn--primary" onClick={create}>
            New page
          </button>
        </div>
      )}

      {notes.length > 0 && (
        <ul className="page-list" aria-label="Pages">
          {notes.map((note) => {
            const thumb =
              isCoverDataUrl(note.coverUrl) || (note.coverUrl && note.coverUrl.startsWith('http'));
            return (
              <li key={note.id}>
                <button type="button" className="page-row" onClick={() => setOpenId(note.id)}>
                  {thumb ? (
                    <span className="page-row__thumb" aria-hidden="true">
                      <img src={note.coverUrl} alt="" />
                    </span>
                  ) : (
                    <span className="page-row__mark" aria-hidden="true">
                      {note.pinned ? '◆' : '○'}
                    </span>
                  )}
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
            );
          })}
        </ul>
      )}

      {dayNotes?.length > 0 && (
        <section className="section life-section">
          <h2 className="section-label">Day notes</h2>
          <p className="section__note">Reflections written on Habits stay with their day.</p>
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
