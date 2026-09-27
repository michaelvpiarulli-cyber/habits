import { useMemo, useState } from 'react';
import { useLife } from '../context/LifeProvider';
import {
  FRIDGE_KINDS,
  FRIDGE_ZONES,
  groupFridgeItems,
  normalizeFridgeZone,
} from '../lib/fridge';
import { FormSheet } from './FormSheet';

function FridgeForm({ item, defaultZone, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(() => ({
    name: item?.name || '',
    brand: item?.brand || '',
    quantity: item?.quantity || '',
    zone: normalizeFridgeZone(item?.zone || item?.aisle || defaultZone || 'fridge'),
    kind: item?.kind || 'other',
    expiresOn: item?.expiresOn || '',
    notes: item?.notes || '',
  }));
  const set = (patch) => setForm((current) => ({ ...current, ...patch }));
  const canSave = form.name.trim();

  return (
    <FormSheet title={item ? 'Edit food' : 'Add food'} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSave) return;
          onSave(form);
        }}
      >
        <div className="field">
          <label className="field__label" htmlFor="fridge-name">
            What is it
          </label>
          <input
            id="fridge-name"
            className="field__input"
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="Eggs"
            autoFocus
          />
        </div>
        <div className="field field--split">
          <label className="field__label" htmlFor="fridge-brand">
            Brand
          </label>
          <input
            id="fridge-brand"
            className="field__input"
            value={form.brand}
            onChange={(e) => set({ brand: e.target.value })}
            placeholder="Optional"
          />
          <label className="field__label" htmlFor="fridge-qty">
            Qty
          </label>
          <input
            id="fridge-qty"
            className="field__input"
            value={form.quantity}
            onChange={(e) => set({ quantity: e.target.value })}
            placeholder="2"
          />
        </div>
        <div className="field field--split">
          <label className="field__label" htmlFor="fridge-zone">
            Where
          </label>
          <select
            id="fridge-zone"
            className="field__input"
            value={form.zone}
            onChange={(e) => set({ zone: e.target.value })}
          >
            {FRIDGE_ZONES.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
          <label className="field__label" htmlFor="fridge-kind">
            Type
          </label>
          <select
            id="fridge-kind"
            className="field__input"
            value={form.kind}
            onChange={(e) => set({ kind: e.target.value })}
          >
            {FRIDGE_KINDS.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field__label" htmlFor="fridge-expires">
            Use by
          </label>
          <input
            id="fridge-expires"
            className="field__input"
            type="date"
            value={form.expiresOn || ''}
            onChange={(e) => set({ expiresOn: e.target.value || null })}
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="fridge-notes">
            Notes
          </label>
          <textarea
            id="fridge-notes"
            className="field__input field__input--area"
            rows={2}
            value={form.notes}
            onChange={(e) => set({ notes: e.target.value })}
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

function FridgeChip({ item, onEdit, onToggle }) {
  const meta = [item.brand, item.quantity].filter(Boolean).join(' · ');
  return (
    <li className={`fridge-chip fridge-chip--${item.kind || 'other'} ${item.checked ? 'is-out' : ''}`}>
      <button type="button" className="fridge-chip__body" onClick={onEdit}>
        <span className="fridge-chip__name">{item.name}</span>
        {meta ? <span className="fridge-chip__meta">{meta}</span> : null}
      </button>
      <button
        type="button"
        className="fridge-chip__out"
        onClick={() => onToggle(item.id)}
        aria-pressed={item.checked}
      >
        {item.checked ? 'Back' : 'Out'}
      </button>
    </li>
  );
}

function ZoneShelf({ section, open, onToggleOpen, onEdit, onToggle, onAdd }) {
  const count = section.items.length;
  return (
    <section className={`fridge-zone ${open ? 'is-open' : ''}`}>
      <button type="button" className="fridge-zone__head" onClick={onToggleOpen}>
        <span className="fridge-zone__label">{section.label}</span>
        <span className="fridge-zone__count">{count ? `${count} in stock` : 'Empty'}</span>
        <span className="fridge-zone__chev" aria-hidden="true">
          {open ? '▾' : '▸'}
        </span>
      </button>
      {open && (
        <div className="fridge-zone__body">
          {count === 0 ? (
            <p className="fridge-zone__empty">Nothing here yet.</p>
          ) : (
            <ul className="fridge-chip-list">
              {section.items.map((item) => (
                <FridgeChip
                  key={item.id}
                  item={item}
                  onEdit={() => onEdit(item)}
                  onToggle={onToggle}
                />
              ))}
            </ul>
          )}
          <button type="button" className="text-btn fridge-zone__add" onClick={onAdd}>
            Add to {section.label.toLowerCase()}
          </button>
        </div>
      )}
    </section>
  );
}

export function GroceryView() {
  const {
    groceryItems,
    addGroceryItem,
    updateGroceryItem,
    toggleGroceryItem,
    deleteGroceryItem,
    clearOutGroceryItems,
  } = useLife();
  const grouped = useMemo(() => groupFridgeItems(groceryItems), [groceryItems]);
  const [door, setDoor] = useState('closed');
  const [openZones, setOpenZones] = useState(() => new Set(['fridge', 'dairy', 'produce']));
  const [editing, setEditing] = useState(null);
  const [showOut, setShowOut] = useState(false);

  const freezer = grouped.sections.find((s) => s.id === 'freezer');
  const cold = grouped.sections.filter((s) => s.id !== 'freezer');
  const stockedCount = grouped.stocked.length;

  const save = (form) => {
    const fields = {
      name: form.name.trim(),
      brand: form.brand.trim(),
      quantity: form.quantity.trim(),
      zone: form.zone,
      kind: form.kind,
      expiresOn: form.expiresOn || null,
      notes: form.notes.trim(),
    };
    if (editing?.id) updateGroceryItem(editing.id, fields);
    else addGroceryItem(fields);
    setEditing(null);
  };

  const toggleZone = (id) => {
    setOpenZones((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="view fridge-view">
      <header className="view__head view__head--row">
        <h1 className="view__title">Fridge</h1>
        <button type="button" className="text-btn" onClick={() => setEditing({ zone: 'fridge' })}>
          Add
        </button>
      </header>

      <p className="fridge-lede">
        {stockedCount
          ? `${stockedCount} things in the kitchen — open a door to look around.`
          : 'Your virtual fridge is empty. Add what you have on hand.'}
      </p>

      <div className={`fridge-appliance ${door === 'closed' ? 'is-closed' : `is-open is-open--${door}`}`}>
        {door === 'closed' ? (
          <div className="fridge-doors" role="group" aria-label="Open the fridge">
            <button
              type="button"
              className="fridge-door fridge-door--freezer"
              onClick={() => setDoor('freezer')}
            >
              <span className="fridge-door__label">Freezer</span>
              <span className="fridge-door__hint">
                {freezer?.items.length || 0} items · tap to open
              </span>
              <span className="fridge-door__handle" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="fridge-door fridge-door--fridge"
              onClick={() => setDoor('fridge')}
            >
              <span className="fridge-door__label">Fridge</span>
              <span className="fridge-door__hint">
                {cold.reduce((n, s) => n + s.items.length, 0)} items · tap to open
              </span>
              <span className="fridge-door__handle" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <div className="fridge-interior">
            <div className="fridge-interior__bar">
              <button type="button" className="chip" onClick={() => setDoor('closed')}>
                Close door
              </button>
              <div className="fridge-interior__tabs">
                <button
                  type="button"
                  className={`chip ${door === 'freezer' ? 'is-on' : ''}`}
                  onClick={() => setDoor('freezer')}
                >
                  Freezer
                </button>
                <button
                  type="button"
                  className={`chip ${door === 'fridge' ? 'is-on' : ''}`}
                  onClick={() => setDoor('fridge')}
                >
                  Fridge
                </button>
              </div>
            </div>

            <div className="fridge-interior__glow" aria-hidden="true" />

            {(door === 'freezer' ? [freezer] : cold).map((section) =>
              section ? (
                <ZoneShelf
                  key={section.id}
                  section={section}
                  open={door === 'freezer' ? true : openZones.has(section.id)}
                  onToggleOpen={() => toggleZone(section.id)}
                  onEdit={setEditing}
                  onToggle={toggleGroceryItem}
                  onAdd={() => setEditing({ zone: section.id })}
                />
              ) : null
            )}
          </div>
        )}
      </div>

      {grouped.out.length > 0 && (
        <section className="section">
          <div className="view__head view__head--row">
            <button type="button" className="chip" onClick={() => setShowOut((v) => !v)}>
              {showOut ? 'Hide finished' : `${grouped.out.length} finished / out`}
            </button>
            <button
              type="button"
              className="text-btn"
              onClick={() => {
                clearOutGroceryItems();
                setShowOut(false);
              }}
            >
              Clear
            </button>
          </div>
          {showOut && (
            <ul className="fridge-chip-list fridge-chip-list--out">
              {grouped.out.map((item) => (
                <FridgeChip
                  key={item.id}
                  item={item}
                  onEdit={() => setEditing(item)}
                  onToggle={toggleGroceryItem}
                />
              ))}
            </ul>
          )}
        </section>
      )}

      {editing !== null && (
        <FridgeForm
          item={editing.id ? editing : null}
          defaultZone={editing.zone}
          onSave={save}
          onDelete={deleteGroceryItem}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
