import { useState } from 'react';
import { useLife } from '../context/LifeProvider';
import { todayISO } from '../lib/dates';
import { BOOK_STATUSES, bookProgress } from '../lib/life';
import { FormSheet } from './FormSheet';

function BookForm({ book, onSave, onClose }) {
  const [form, setForm] = useState(() => ({
    title: book?.title || '',
    author: book?.author || '',
    totalPages: book?.totalPages || '',
    currentPage: book?.currentPage || '',
    status: book?.status || 'reading',
    notes: book?.notes || '',
  }));
  const set = (patch) => setForm((current) => ({ ...current, ...patch }));

  return (
    <FormSheet title={book ? 'Edit book' : 'New book'} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.title.trim()) return;
          onSave(form);
        }}
      >
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
            Status
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
  return (
    <li className="card">
      <div className="card__head">
        <div>
          <p className="card__name">{book.title}</p>
          <p className="card__meta">{book.author || 'No author'}</p>
        </div>
      </div>
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
    </li>
  );
}

export function BooksView() {
  const { books, addBook, updateBook, setBookPage, deleteBook } = useLife();
  const [editing, setEditing] = useState(null);
  const reading = books.filter((book) => book.status === 'reading' || book.status === 'paused');
  const queued = books.filter((book) => book.status === 'queued');
  const done = books.filter((book) => book.status === 'done');

  const save = (form) => {
    const fields = {
      title: form.title.trim(),
      author: form.author.trim(),
      totalPages: Number(form.totalPages) || 0,
      currentPage: Number(form.currentPage) || 0,
      status: form.status,
      notes: form.notes,
      startedOn: form.status === 'reading' ? todayISO() : null,
      finishedOn: form.status === 'done' ? todayISO() : null,
    };
    if (editing?.id) updateBook(editing.id, fields);
    else addBook(fields);
    setEditing(null);
  };

  return (
    <div className="view">
      <header className="view__head view__head--row">
        <h1 className="view__title">Books</h1>
        <button type="button" className="text-btn" onClick={() => setEditing({})}>
          New
        </button>
      </header>

      {books.length === 0 && <p className="quiet">No books yet.</p>}

      {reading.length > 0 && (
        <section className="section">
          <h2 className="eyebrow">In progress</h2>
          <ul className="cards">
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
          <h2 className="eyebrow">Up next</h2>
          <ul className="cards">
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
          <ul className="cards">
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
