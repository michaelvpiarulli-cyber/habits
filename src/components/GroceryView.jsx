import { useEffect, useMemo, useState } from 'react';
import { useLife } from '../context/LifeProvider';
import {
  FRIDGE_KINDS,
  FRIDGE_ZONES,
  groupFridgeItems,
  normalizeFridgeZone,
} from '../lib/fridge';
import { FormSheet } from './FormSheet';

const KIND_GLYPH = {
  dairy: '◇',
  produce: '◉',
  meat: '▣',
  beverage: '◈',
  frozen: '❄',
  condiment: '◍',
  bakery: '▢',
  leftover: '◐',
  other: '○',
};

function shortName(name) {
  const text = (name || '').trim();
  if (text.length <= 18) return text;
  return `${text.slice(0, 16)}…`;
}

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
        {item && (
          <>
            <button
              type="button"
              className="btn"
              onClick={() => {
                onSave({ ...form, markOut: !item.checked });
              }}
            >
              {item.checked ? 'Put back in fridge' : 'Mark out'}
            </button>
            {onDelete && (
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
          </>
        )}
      </form>
    </FormSheet>
  );
}

function FoodPack({ item, index, onEdit }) {
  const kind = item.kind || 'other';
  const title = [item.brand, item.name, item.quantity].filter(Boolean).join(' · ');
  return (
    <button
      type="button"
      className={`food-pack food-pack--${kind}`}
      style={{ '--pack-delay': `${Math.min(index, 12) * 28}ms` }}
      title={title}
      onClick={onEdit}
    >
      <span className="food-pack__glyph" aria-hidden="true">
        {KIND_GLYPH[kind] || KIND_GLYPH.other}
      </span>
      <span className="food-pack__name">{shortName(item.name)}</span>
      {item.brand ? <span className="food-pack__brand">{item.brand}</span> : null}
    </button>
  );
}

function ShelfRow({ label, items, onEdit, onAdd, drawer }) {
  return (
    <div className={`fridge-shelf ${drawer ? 'fridge-shelf--drawer' : ''}`}>
      <div className="fridge-shelf__rail">
        <span className="fridge-shelf__label">{label}</span>
        <button type="button" className="fridge-shelf__add" onClick={onAdd}>
          +
        </button>
      </div>
      <div className="fridge-shelf__glass">
        {items.length === 0 ? (
          <p className="fridge-shelf__empty">Empty</p>
        ) : (
          <div className="food-pack-row">
            {items.map((item, index) => (
              <FoodPack key={item.id} item={item} index={index} onEdit={() => onEdit(item)} />
            ))}
          </div>
        )}
      </div>
    </div>
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
    seedFridgeFromPhotos,
  } = useLife();
  const grouped = useMemo(() => groupFridgeItems(groceryItems), [groceryItems]);
  const [door, setDoor] = useState('closed');
  const [editing, setEditing] = useState(null);
  const [showOut, setShowOut] = useState(false);

  useEffect(() => {
    seedFridgeFromPhotos();
  }, [seedFridgeFromPhotos]);

  const byId = useMemo(() => {
    const map = Object.fromEntries(grouped.sections.map((s) => [s.id, s.items]));
    return map;
  }, [grouped.sections]);

  const freezerItems = byId.freezer || [];
  const fridgeItems = byId.fridge || [];
  const dairyItems = byId.dairy || [];
  const produceItems = byId.produce || [];
  const doorItems = byId.door || [];
  const coldCount = fridgeItems.length + dairyItems.length + produceItems.length + doorItems.length;
  const stockedCount = grouped.stocked.length;

  const openDoor = (next) => setDoor((current) => (current === next ? 'closed' : next));

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
    if (editing?.id) {
      updateGroceryItem(editing.id, fields);
      if (form.markOut === true && !editing.checked) toggleGroceryItem(editing.id);
      if (form.markOut === false && editing.checked) toggleGroceryItem(editing.id);
    } else {
      addGroceryItem(fields);
    }
    setEditing(null);
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
          ? `${stockedCount} things inside — pull a handle to open.`
          : 'Empty fridge. Add what you have on hand.'}
      </p>

      <div
        className={`fridge-stage is-${door}`}
        data-door={door}
      >
        <div className="fridge-body" aria-label="Virtual fridge">
          <div className="fridge-body__frame" aria-hidden="true" />
          <div className="fridge-body__vent" aria-hidden="true" />

          <div className="fridge-cavity">
            <div className={`fridge-cavity__light ${door !== 'closed' ? 'is-on' : ''}`} aria-hidden="true" />

            <div className={`fridge-bay fridge-bay--freezer ${door === 'freezer' ? 'is-shown' : ''}`}>
              <ShelfRow
                label="Freezer"
                items={freezerItems}
                onEdit={setEditing}
                onAdd={() => setEditing({ zone: 'freezer', kind: 'frozen' })}
              />
            </div>

            <div className={`fridge-bay fridge-bay--cold ${door === 'fridge' ? 'is-shown' : ''}`}>
              <ShelfRow
                label="Top shelf"
                items={[...doorItems, ...fridgeItems.slice(0, Math.ceil(fridgeItems.length / 2))]}
                onEdit={setEditing}
                onAdd={() => setEditing({ zone: 'fridge' })}
              />
              <ShelfRow
                label="Middle shelf"
                items={fridgeItems.slice(Math.ceil(fridgeItems.length / 2))}
                onEdit={setEditing}
                onAdd={() => setEditing({ zone: 'fridge' })}
              />
              <ShelfRow
                label="Dairy drawer"
                items={dairyItems}
                drawer
                onEdit={setEditing}
                onAdd={() => setEditing({ zone: 'dairy', kind: 'dairy' })}
              />
              <ShelfRow
                label="Produce drawer"
                items={produceItems}
                drawer
                onEdit={setEditing}
                onAdd={() => setEditing({ zone: 'produce', kind: 'produce' })}
              />
            </div>
          </div>

          <button
            type="button"
            className={`fridge-hinge-door fridge-hinge-door--freezer ${door === 'freezer' ? 'is-open' : ''}`}
            aria-expanded={door === 'freezer'}
            aria-label={door === 'freezer' ? 'Close freezer' : `Open freezer, ${freezerItems.length} items`}
            onClick={() => openDoor('freezer')}
          >
            <span className="fridge-hinge-door__face">
              <span className="fridge-hinge-door__brand">Freezer</span>
              <span className="fridge-hinge-door__count">{freezerItems.length}</span>
              <span className="fridge-hinge-door__handle" aria-hidden="true" />
              <span className="fridge-hinge-door__seal" aria-hidden="true" />
            </span>
          </button>

          <button
            type="button"
            className={`fridge-hinge-door fridge-hinge-door--fridge ${door === 'fridge' ? 'is-open' : ''}`}
            aria-expanded={door === 'fridge'}
            aria-label={door === 'fridge' ? 'Close fridge' : `Open fridge, ${coldCount} items`}
            onClick={() => openDoor('fridge')}
          >
            <span className="fridge-hinge-door__face">
              <span className="fridge-hinge-door__brand">Fridge</span>
              <span className="fridge-hinge-door__count">{coldCount}</span>
              <span className="fridge-hinge-door__handle" aria-hidden="true" />
              <span className="fridge-hinge-door__dispense" aria-hidden="true" />
              <span className="fridge-hinge-door__seal" aria-hidden="true" />
            </span>
          </button>
        </div>

        {door !== 'closed' && (
          <button type="button" className="fridge-close-hint" onClick={() => setDoor('closed')}>
            Close door
          </button>
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
            <ul className="fridge-out-list">
              {grouped.out.map((item) => (
                <li key={item.id}>
                  <button type="button" className="fridge-out-row" onClick={() => setEditing(item)}>
                    <span>{item.name}</span>
                    <span className="fridge-out-row__meta">{item.brand || 'Out'}</span>
                  </button>
                  <button type="button" className="text-btn" onClick={() => toggleGroceryItem(item.id)}>
                    Back
                  </button>
                </li>
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
