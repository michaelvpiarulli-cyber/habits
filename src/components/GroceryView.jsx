import { useMemo, useState } from 'react';
import { useLife } from '../context/LifeProvider';
import { GROCERY_AISLES, groupGroceryItems } from '../lib/life';
import { FormSheet } from './FormSheet';

function GroceryForm({ item, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(() => ({
    name: item?.name || '',
    quantity: item?.quantity || '',
    aisle: item?.aisle || 'produce',
    notes: item?.notes || '',
  }));
  const set = (patch) => setForm((current) => ({ ...current, ...patch }));
  const canSave = form.name.trim();

  return (
    <FormSheet title={item ? 'Edit item' : 'Add item'} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSave) return;
          onSave(form);
        }}
      >
        <div className="field">
          <label className="field__label" htmlFor="grocery-name">
            Item
          </label>
          <input
            id="grocery-name"
            className="field__input"
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="Oat milk"
            autoFocus
          />
        </div>
        <div className="field field--split">
          <label className="field__label" htmlFor="grocery-qty">
            Qty
          </label>
          <input
            id="grocery-qty"
            className="field__input"
            value={form.quantity}
            onChange={(e) => set({ quantity: e.target.value })}
            placeholder="2"
          />
          <label className="field__label" htmlFor="grocery-aisle">
            Aisle
          </label>
          <select
            id="grocery-aisle"
            className="field__input"
            value={form.aisle}
            onChange={(e) => set({ aisle: e.target.value })}
          >
            {GROCERY_AISLES.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field__label" htmlFor="grocery-notes">
            Notes
          </label>
          <textarea
            id="grocery-notes"
            className="field__input field__input--area"
            rows={2}
            value={form.notes}
            onChange={(e) => set({ notes: e.target.value })}
            placeholder="Brand, size, anything else"
          />
        </div>
        <button type="submit" className="btn btn--primary" disabled={!canSave}>
          Save
        </button>
        {item && onDelete && (
          <button
            type="button"
            className="btn btn--danger"
            onClick={() => {
              onDelete(item.id);
              onClose();
            }}
          >
            Delete
          </button>
        )}
      </form>
    </FormSheet>
  );
}

function GroceryRow({ item, onToggle, onEdit }) {
  const meta = [item.quantity, item.notes].filter(Boolean).join(' · ');
  return (
    <li className={`task ${item.checked ? 'is-done' : ''}`}>
      <button
        type="button"
        className={`task__check ${item.checked ? 'is-on' : ''}`}
        aria-pressed={item.checked}
        aria-label={item.checked ? 'Mark still needed' : 'Mark got it'}
        onClick={() => onToggle(item.id)}
      />
      <button type="button" className="task__body" onClick={onEdit}>
        <span className="task__title">{item.name}</span>
        {meta ? <span className="task__meta">{meta}</span> : null}
      </button>
    </li>
  );
}

export function GroceryView() {
  const {
    groceryItems,
    addGroceryItem,
    updateGroceryItem,
    toggleGroceryItem,
    deleteGroceryItem,
    clearCheckedGroceryItems,
  } = useLife();
  const grouped = useMemo(() => groupGroceryItems(groceryItems), [groceryItems]);
  const [editing, setEditing] = useState(null);
  const [showChecked, setShowChecked] = useState(false);

  const save = (form) => {
    const fields = {
      name: form.name.trim(),
      quantity: form.quantity.trim(),
      aisle: form.aisle,
      notes: form.notes.trim(),
    };
    if (editing?.id) updateGroceryItem(editing.id, fields);
    else addGroceryItem(fields);
    setEditing(null);
  };

  return (
    <div className="view">
      <header className="view__head view__head--row">
        <h1 className="view__title">Grocery</h1>
        <button type="button" className="text-btn" onClick={() => setEditing({})}>
          Add
        </button>
      </header>

      {grouped.sections.map((section) => (
        <section key={section.id} className="section">
          <h2 className="eyebrow">{section.label}</h2>
          <ul className="task-list">
            {section.items.map((item) => (
              <GroceryRow
                key={item.id}
                item={item}
                onToggle={toggleGroceryItem}
                onEdit={() => setEditing(item)}
              />
            ))}
          </ul>
        </section>
      ))}

      {grouped.open.length === 0 && (
        <div className="empty">
          <p className="empty__title">List is clear</p>
          <p className="empty__body">Add what you need and check it off as you shop.</p>
        </div>
      )}

      {grouped.checked.length > 0 && (
        <section className="section">
          <div className="view__head view__head--row">
            <button type="button" className="chip" onClick={() => setShowChecked((v) => !v)}>
              {showChecked
                ? 'Hide checked'
                : `Show ${grouped.checked.length} checked`}
            </button>
            <button
              type="button"
              className="text-btn"
              onClick={() => {
                clearCheckedGroceryItems();
                setShowChecked(false);
              }}
            >
              Clear checked
            </button>
          </div>
          {showChecked && (
            <ul className="task-list">
              {grouped.checked.map((item) => (
                <GroceryRow
                  key={item.id}
                  item={item}
                  onToggle={toggleGroceryItem}
                  onEdit={() => setEditing(item)}
                />
              ))}
            </ul>
          )}
        </section>
      )}

      {editing !== null && (
        <GroceryForm
          item={editing.id ? editing : null}
          onSave={save}
          onDelete={deleteGroceryItem}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
