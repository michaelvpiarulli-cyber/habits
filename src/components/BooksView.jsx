import { useEffect, useRef, useState } from 'react';
import { useLife } from '../context/LifeProvider';
import { todayISO } from '../lib/dates';
import { fileToCoverDataUrl, isCoverDataUrl } from '../lib/covers';
import { BOOK_STATUSES, bookProgress } from '../lib/life';
import { FormSheet } from './FormSheet';

function BookForm({ book, onSave, onClose }) {
  const fileRef = useRef(null);
  const [form, setForm] = useState(() => ({
    title: book?.title || '',
    author: book?.author || '',
    totalPages: book?.totalPages || '',
    currentPage: book?.currentPage || '',
    status: book?.status || 'reading',
    notes: book?.notes || '',
    coverUrl: book?.coverUrl || '',
  }));
  const [coverError, setCoverError] = useState('');
  const [coverBusy, setCoverBusy] = useState(false);
  const set = (patch) => setForm((current) => ({ ...current, ...patch }));

  const onCover = async (file) => {
    setCoverError('');
    if (!file) return;
    setCoverBusy(true);
    try {
      const coverUrl = await fileToCoverDataUrl(file);
      set({ coverUrl });
    } catch (err) {
      setCoverError(err.message || 'Could not use that image.');
    } finally {
      setCoverBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <FormSheet title={book ? 'Edit book' : 'New book'} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.title.trim()) return;
          onSave(form);
        }}
      >
        <div className="field book-cover-field">
          <span className="field__label">Cover</span>
          <div className="book-cover-field__row">
            <div
              className={`book-cover-thumb ${form.coverUrl ? 'has-image' : ''}`}
              aria-hidden="true"
            >
              {form.coverUrl ? (
                <img src={form.coverUrl} alt="" />
              ) : (
                <span className="book-cover-thumb__empty">No cover</span>
              )}
            </div>
            <div className="book-cover-field__actions">
              <label className="chip chip--file">
                {coverBusy ? 'Working…' : form.coverUrl ? 'Replace' : 'Upload'}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  hidden
                  disabled={coverBusy}
                  onChange={(e) => onCover(e.target.files?.[0])}
                />
              </label>
              {form.coverUrl && (
                <button type="button" className="chip" onClick={() => set({ coverUrl: '' })}>
                  Clear
                </button>
              )}
            </div>
          </div>
          {coverError && <p className="note note--bad">{coverError}</p>}
        </div>
        <div className="field">
          <label className="field__label" htmlFor="book-title">
            Title
          </label>
          <input
            id="book-title"
            className="field__input"
            value={form.title}
            onChange={(e) => set({ title: e.target.value })}
            autoFocus
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="book-author">
            Author
          </label>
          <input
            id="book-author"
            className="field__input"
            value={form.author}
            onChange={(e) => set({ author: e.target.value })}
          />
        </div>
        <div className="field field--split">
          <label className="field__label" htmlFor="book-current">
            Page
          </label>
          <input
            id="book-current"
            className="field__input field__input--num"
            type="number"
            min="0"
            value={form.currentPage}
            onChange={(e) => set({ currentPage: e.target.value })}
          />
          <label className="field__label" htmlFor="book-total">
            Of
          </label>
          <input
            id="book-total"
            className="field__input field__input--num"
            type="number"
            min="0"
            value={form.totalPages}
            onChange={(e) => set({ totalPages: e.target.value })}
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="book-status">
            Shelf
          </label>
          <select
            id="book-status"
            className="field__input"
            value={form.status}
            onChange={(e) => set({ status: e.target.value })}
          >
            {BOOK_STATUSES.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn--primary" disabled={!form.title.trim()}>
          Save
        </button>
      </form>
    </FormSheet>
  );
}

function BookCard({ book, onPage, onEdit, onDelete }) {
  const pct = Math.round(bookProgress(book) * 100);
  const cover = isCoverDataUrl(book.coverUrl) || (book.coverUrl && book.coverUrl.startsWith('http'));
  return (
    <li className="book-shelf-card">
      <button type="button" className="book-shelf-card__cover" onClick={onEdit} aria-label={`Edit ${book.title}`}>
        {cover ? (
          <img src={book.coverUrl} alt="" />
        ) : (
          <span className="book-shelf-card__spine">
            <span className="book-shelf-card__spine-title">{book.title}</span>
          </span>
        )}
      </button>
      <div className="book-shelf-card__body">
        <p className="card__name">{book.title}</p>
        <p className="card__meta">{book.author || 'No author'}</p>
        <div className="goal__bar" role="img" aria-label={`${pct} percent`}>
          <span className="goal__fill" style={{ width: `${pct}%` }} />
        </div>
        <p className="card__meta">
          {book.status === 'done'
            ? 'Finished'
            : `${book.currentPage}${book.totalPages ? ` of ${book.totalPages}` : ''} pages`}
        </p>
        <div className="goal__actions">
          {book.status !== 'done' && (
            <button type="button" className="chip" onClick={() => onPage(book.currentPage + 10)}>
              +10 pages
            </button>
          )}
          <button type="button" className="chip" onClick={onEdit}>
            Edit
          </button>
          <button type="button" className="chip chip--danger" onClick={onDelete}>
            Delete
          </button>
        </div>
      </div>
    </li>
  );
}

export function BooksView({ initialCreate = false, onConsumedIntent }) {
  const { books, addBook, updateBook, setBookPage, deleteBook } = useLife();
  const [editing, setEditing] = useState(null);
  const reading = books.filter((book) => book.status === 'reading' || book.status === 'paused');
  const queued = books.filter((book) => book.status === 'queued');
  const done = books.filter((book) => book.status === 'done');

  useEffect(() => {
    if (!initialCreate) return;
    setEditing({});
    onConsumedIntent?.();
  }, [initialCreate]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = (form) => {
    const fields = {
      title: form.title.trim(),
      author: form.author.trim(),
      totalPages: Number(form.totalPages) || 0,
      currentPage: Number(form.currentPage) || 0,
      status: form.status,
      notes: form.notes,
      coverUrl: form.coverUrl || '',
      startedOn: form.status === 'reading' ? todayISO() : null,
      finishedOn: form.status === 'done' ? todayISO() : null,
    };
    if (editing?.id) updateBook(editing.id, fields);
    else addBook(fields);
    setEditing(null);
  };

  return (
    <div className="view books-view">
      <header className="view__head view__head--row">
        <div>
          <p className="eyebrow">Planning</p>
          <h1 className="view__title">Books</h1>
        </div>
        <button type="button" className="text-btn" onClick={() => setEditing({})}>
          New book
        </button>
      </header>
      <p className="books-view__lede">Want to read, reading, and finished — with covers if you have them.</p>

      {books.length === 0 && (
        <div className="empty">
          <p className="empty__title">Empty shelf</p>
          <p className="empty__body">Add a book and drop a cover so it shows up in Planning.</p>
          <button type="button" className="btn btn--primary" onClick={() => setEditing({})}>
            New book
          </button>
        </div>
      )}

      {reading.length > 0 && (
        <section className="section">
          <h2 className="eyebrow">Reading</h2>
          <ul className="book-shelf">
            {reading.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onPage={(page) => setBookPage(book.id, page)}
                onEdit={() => setEditing(book)}
                onDelete={() => deleteBook(book.id)}
              />
            ))}
          </ul>
        </section>
      )}

      {queued.length > 0 && (
        <section className="section">
          <h2 className="eyebrow">Want to read</h2>
          <ul className="book-shelf">
            {queued.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onPage={(page) => setBookPage(book.id, page)}
                onEdit={() => setEditing(book)}
                onDelete={() => deleteBook(book.id)}
              />
            ))}
          </ul>
        </section>
      )}

      {done.length > 0 && (
        <section className="section">
          <h2 className="eyebrow">Finished</h2>
          <ul className="book-shelf">
            {done.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onPage={(page) => setBookPage(book.id, page)}
                onEdit={() => setEditing(book)}
                onDelete={() => deleteBook(book.id)}
              />
            ))}
          </ul>
        </section>
      )}

      {editing && (
        <BookForm book={editing.id ? editing : null} onSave={save} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
