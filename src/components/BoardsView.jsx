import { useMemo, useState } from 'react';
import { useLife } from '../context/LifeProvider';
import { relativeDay, todayISO } from '../lib/dates';
import { BOARD_COLUMNS, groupBoardCards, nextBoardSortOrder } from '../lib/boards';
import { FormSheet } from './FormSheet';

function CardForm({ card, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(() => ({
    title: card?.title || '',
    notes: card?.notes || '',
    column: card?.column || 'backlog',
    dueDate: card?.dueDate || '',
  }));
  const set = (patch) => setForm((current) => ({ ...current, ...patch }));

  return (
    <FormSheet title={card?.id ? 'Edit card' : 'New card'} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.title.trim()) return;
          onSave(form);
        }}
      >
        <div className="field">
          <label className="field__label" htmlFor="board-title">
            Card
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
            Column
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
              if (window.confirm('Delete this card?')) onDelete(card.id);
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
  return (
    <li className={`board-card ${overdue ? 'is-overdue' : ''}`}>
      <button type="button" className="board-card__body" onClick={onEdit}>
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

/**
 * One calm kanban — Backlog / Doing / Done — with optional due dates.
 */
export function BoardsView() {
  const { boardCards, addBoardCard, updateBoardCard, deleteBoardCard } = useLife();
  const today = todayISO();
  const columns = useMemo(() => groupBoardCards(boardCards), [boardCards]);
  const [editing, setEditing] = useState(null);

  const save = (form) => {
    const fields = {
      title: form.title.trim(),
      notes: form.notes || '',
      column: form.column || 'backlog',
      dueDate: form.dueDate || null,
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
          <p className="eyebrow">Create</p>
          <h1 className="view__title">Boards</h1>
        </div>
        <button type="button" className="text-btn" onClick={() => setEditing({})}>
          New
        </button>
      </header>
      <p className="boards-view__lede">Three columns. Move work when it moves you.</p>

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
