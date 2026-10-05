import { useEffect, useMemo, useState } from 'react';
import { useLife } from '../context/LifeProvider';
import { relativeDay, todayISO } from '../lib/dates';
import { BOARD_COLUMNS, groupBoardCards, nextBoardSortOrder } from '../lib/boards';
import { fileToCoverDataUrl, isCoverDataUrl } from '../lib/covers';
import { FormSheet } from './FormSheet';

const VIEW_KEY = 'tally.boards.view';

function CardForm({ card, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(() => ({
    title: card?.title || '',
    notes: card?.notes || '',
    column: card?.column || 'backlog',
    dueDate: card?.dueDate || '',
    coverUrl: card?.coverUrl || '',
  }));
  const [coverError, setCoverError] = useState('');
  const [coverBusy, setCoverBusy] = useState(false);
  const set = (patch) => setForm((current) => ({ ...current, ...patch }));

  const onCover = async (file) => {
    if (!file) return;
    setCoverBusy(true);
    setCoverError('');
    try {
      set({ coverUrl: await fileToCoverDataUrl(file) });
    } catch (err) {
      setCoverError(err?.message || 'Could not use that image.');
    } finally {
      setCoverBusy(false);
    }
  };

  const hasCover = isCoverDataUrl(form.coverUrl) || (form.coverUrl && form.coverUrl.startsWith('http'));

  return (
    <FormSheet title={card?.id ? 'Edit row' : 'New row'} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.title.trim()) return;
          onSave(form);
        }}
      >
        <div className="field">
          <label className="field__label" htmlFor="board-title">
            Title
          </label>
          <input
            id="board-title"
            className="field__input"
            value={form.title}
            onChange={(e) => set({ title: e.target.value })}
            placeholder="Ship the quiet board"
            autoFocus
          />
        </div>
        <div className="field book-cover-field">
          <span className="field__label">Image</span>
          <div className="book-cover-field__row">
            <div className={`book-cover-thumb ${hasCover ? 'has-image' : ''}`} aria-hidden="true">
              {hasCover ? <img src={form.coverUrl} alt="" /> : <span className="book-cover-thumb__empty">None</span>}
            </div>
            <div className="book-cover-field__actions">
              <label className="chip chip--file">
                {coverBusy ? 'Working…' : hasCover ? 'Replace' : 'Upload'}
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
                <button type="button" className="chip" onClick={() => set({ coverUrl: '' })}>
                  Clear
                </button>
              )}
            </div>
          </div>
          {coverError && <p className="note note--bad">{coverError}</p>}
        </div>
        <div className="field">
          <label className="field__label" htmlFor="board-notes">
            Notes
          </label>
          <textarea
            id="board-notes"
            className="field__input"
            rows={3}
            value={form.notes}
            onChange={(e) => set({ notes: e.target.value })}
          />
        </div>
        <div className="field field--split">
          <label className="field__label" htmlFor="board-column">
            Status
          </label>
          <select
            id="board-column"
            className="field__input"
            value={form.column}
            onChange={(e) => set({ column: e.target.value })}
          >
            {BOARD_COLUMNS.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
          <label className="field__label" htmlFor="board-due">
            Due
          </label>
          <input
            id="board-due"
            className="field__input"
            type="date"
            value={form.dueDate || ''}
            onChange={(e) => set({ dueDate: e.target.value || null })}
          />
        </div>
        <button type="submit" className="btn btn--primary" disabled={!form.title.trim()}>
          Save
        </button>
        {card?.id && onDelete && (
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              if (window.confirm('Delete this row?')) onDelete(card.id);
            }}
          >
            Delete
          </button>
        )}
      </form>
    </FormSheet>
  );
}

function BoardCard({ card, today, onEdit, onMove }) {
  const overdue = card.dueDate && card.column !== 'done' && card.dueDate < today;
  const hasCover = isCoverDataUrl(card.coverUrl) || (card.coverUrl && card.coverUrl.startsWith('http'));
  return (
    <li className={`board-card ${overdue ? 'is-overdue' : ''}`}>
      <button type="button" className="board-card__body" onClick={onEdit}>
        {hasCover && (
          <span className="board-card__cover" aria-hidden="true">
            <img src={card.coverUrl} alt="" />
          </span>
        )}
        <span className="board-card__title">{card.title}</span>
        {card.dueDate && (
          <span className="board-card__meta">
            {overdue ? 'Due ' : ''}
            {relativeDay(card.dueDate)}
          </span>
        )}
        {card.notes?.trim() && (
          <span className="board-card__notes">{card.notes.trim().split('\n')[0]}</span>
        )}
      </button>
      <div className="board-card__moves">
        {BOARD_COLUMNS.filter(([id]) => id !== card.column).map(([id, label]) => (
          <button key={id} type="button" className="chip" onClick={() => onMove(id)}>
            {label}
          </button>
        ))}
      </div>
    </li>
  );
}

function TableView({ cards, today, onEdit }) {
  const columnLabel = Object.fromEntries(BOARD_COLUMNS);
  if (cards.length === 0) {
    return (
      <button type="button" className="life-empty-row" onClick={() => onEdit({})}>
        Add a row — title, status, due date, optional image.
      </button>
    );
  }
  return (
    <div className="plan-table-wrap">
      <table className="plan-table">
        <thead>
          <tr>
            <th scope="col"> </th>
            <th scope="col">Name</th>
            <th scope="col">Status</th>
            <th scope="col">Due</th>
          </tr>
        </thead>
        <tbody>
          {cards.map((card) => {
            const overdue = card.dueDate && card.column !== 'done' && card.dueDate < today;
            const hasCover =
              isCoverDataUrl(card.coverUrl) || (card.coverUrl && card.coverUrl.startsWith('http'));
            return (
              <tr key={card.id} className={overdue ? 'is-overdue' : ''}>
                <td className="plan-table__thumb">
                  <button type="button" className="plan-table__open" onClick={() => onEdit(card)}>
                    {hasCover ? <img src={card.coverUrl} alt="" /> : <span aria-hidden="true">○</span>}
                  </button>
                </td>
                <td>
                  <button type="button" className="plan-table__name" onClick={() => onEdit(card)}>
                    <span>{card.title}</span>
                    {card.notes?.trim() && (
                      <span className="plan-table__notes">{card.notes.trim().split('\n')[0]}</span>
                    )}
                  </button>
                </td>
                <td>
                  <span className={`plan-table__status plan-table__status--${card.column}`}>
                    {columnLabel[card.column] || card.column}
                  </span>
                </td>
                <td className="plan-table__due">
                  {card.dueDate ? relativeDay(card.dueDate) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Planning database — table or board layout, optional images per row.
 */
export function BoardsView({
  initialCardId = null,
  initialCreate = false,
  onConsumedIntent,
}) {
  const { boardCards, addBoardCard, updateBoardCard, deleteBoardCard } = useLife();
  const today = todayISO();
  const columns = useMemo(() => groupBoardCards(boardCards), [boardCards]);
  const flatCards = useMemo(
    () => columns.flatMap((col) => col.cards),
    [columns]
  );
  const [editing, setEditing] = useState(null);
  const [layout, setLayout] = useState(() => {
    try {
      return localStorage.getItem(VIEW_KEY) === 'board' ? 'board' : 'table';
    } catch {
      return 'table';
    }
  });

  useEffect(() => {
    if (initialCardId) {
      const card = boardCards.find((c) => c.id === initialCardId);
      if (card) setEditing(card);
      onConsumedIntent?.();
      return;
    }
    if (initialCreate) {
      setEditing({});
      onConsumedIntent?.();
    }
  }, [initialCardId, initialCreate]); // eslint-disable-line react-hooks/exhaustive-deps

  const setView = (next) => {
    setLayout(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      /* ignore */
    }
  };

  const save = (form) => {
    const fields = {
      title: form.title.trim(),
      notes: form.notes || '',
      column: form.column || 'backlog',
      dueDate: form.dueDate || null,
      coverUrl: form.coverUrl || '',
    };
    if (editing?.id) {
      updateBoardCard(editing.id, fields);
    } else {
      addBoardCard({
        ...fields,
        sortOrder: nextBoardSortOrder(boardCards, fields.column),
      });
    }
    setEditing(null);
  };

  return (
    <div className="view boards-view">
      <header className="view__head view__head--row">
        <div>
          <h1 className="view__title">Boards</h1>
        </div>
        <div className="boards-view__actions">
          <div className="boards-view__toggle" role="group" aria-label="Layout">
            <button
              type="button"
              className={`seg-btn ${layout === 'table' ? 'is-on' : ''}`}
              aria-pressed={layout === 'table'}
              onClick={() => setView('table')}
            >
              Table
            </button>
            <button
              type="button"
              className={`seg-btn ${layout === 'board' ? 'is-on' : ''}`}
              aria-pressed={layout === 'board'}
              onClick={() => setView('board')}
            >
              Board
            </button>
          </div>
          <button type="button" className="text-btn" onClick={() => setEditing({})}>
            New row
          </button>
        </div>
      </header>

      {layout === 'table' ? (
        <TableView cards={flatCards} today={today} onEdit={setEditing} />
      ) : (
        <div className="board-columns">
          {columns.map((col) => (
            <section key={col.id} className="board-column">
              <header className="board-column__head">
                <h2 className="board-column__title">{col.label}</h2>
                <span className="board-column__count">{col.cards.length}</span>
              </header>
              {col.cards.length === 0 ? (
                <button
                  type="button"
                  className="board-column__empty"
                  onClick={() => setEditing({ column: col.id })}
                >
                  Add a card
                </button>
              ) : (
                <ul className="board-column__list">
                  {col.cards.map((card) => (
                    <BoardCard
                      key={card.id}
                      card={card}
                      today={today}
                      onEdit={() => setEditing(card)}
                      onMove={(column) =>
                        updateBoardCard(card.id, {
                          column,
                          sortOrder: nextBoardSortOrder(boardCards, column),
                        })
                      }
                    />
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      {editing !== null && (
        <CardForm
          card={editing.id ? editing : { column: editing.column || 'backlog' }}
          onSave={save}
          onDelete={(id) => {
            deleteBoardCard(id);
            setEditing(null);
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
