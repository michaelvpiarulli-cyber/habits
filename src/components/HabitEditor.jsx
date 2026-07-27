import { useEffect, useState } from 'react';
import { KINDS } from '../lib/habits';
import { WEEKDAY_INITIALS, WEEKDAY_LABELS } from '../lib/dates';

const blank = {
  name: '',
  emoji: '',
  kind: 'check',
  target: '',
  unit: '',
  cadence: 'daily',
  weekdays: [0, 2, 4],
  perWeek: 3,
};

/** Create or edit a habit. One sheet for both — the fields are identical. */
export function HabitEditor({ habit, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(() =>
    habit
      ? {
          ...blank,
          ...habit,
          target: habit.target ?? '',
          weekdays: habit.weekdays?.length ? habit.weekdays : blank.weekdays,
        }
      : blank
  );

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const needsTarget = form.kind === 'count' || form.kind === 'amount';
  const showsNumbers = needsTarget || form.kind === 'measure';
  const canSave = form.name.trim() && (!needsTarget || Number(form.target) > 0);

  const submit = (e) => {
    e.preventDefault();
    if (!canSave) return;
    onSave({
      name: form.name.trim(),
      emoji: form.emoji.trim(),
      kind: form.kind,
      target: showsNumbers && form.target !== '' ? Number(form.target) : null,
      unit: form.unit.trim(),
      cadence: form.cadence,
      weekdays: form.cadence === 'weekdays' ? form.weekdays : [],
      perWeek: Number(form.perWeek) || 3,
    });
  };

  const toggleWeekday = (i) =>
    set({
      weekdays: form.weekdays.includes(i)
        ? form.weekdays.filter((d) => d !== i)
        : [...form.weekdays, i].sort((a, b) => a - b),
    });

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label={habit ? 'Edit habit' : 'New habit'}>
      <button type="button" className="sheet__scrim" onClick={onClose} aria-label="Close" />

      <form className="sheet__panel" onSubmit={submit}>
        <header className="sheet__head">
          <h2 className="sheet__title">{habit ? 'Edit habit' : 'New habit'}</h2>
          <button type="button" className="sheet__close" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="sheet__body">
          <div className="field field--split">
            <label className="field__label" htmlFor="habit-emoji">
              Icon
            </label>
            <input
              id="habit-emoji"
              className="field__input field__input--emoji"
              value={form.emoji}
              onChange={(e) => set({ emoji: e.target.value })}
              placeholder="🥦"
              maxLength={4}
            />
            <label className="field__label" htmlFor="habit-name">
              Name
            </label>
            <input
              id="habit-name"
              className="field__input"
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="Walk after meals"
              autoFocus
            />
          </div>

          <fieldset className="field">
            <legend className="field__label">How you track it</legend>
            <div className="options">
              {KINDS.map((k) => (
                <label key={k.id} className={`option ${form.kind === k.id ? 'is-on' : ''}`}>
                  <input
                    type="radio"
                    name="kind"
                    value={k.id}
                    checked={form.kind === k.id}
                    onChange={() => set({ kind: k.id })}
                  />
                  <span className="option__label">{k.label}</span>
                  <span className="option__hint">{k.hint}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {showsNumbers && (
            <div className="field field--split">
              <label className="field__label" htmlFor="habit-target">
                {form.kind === 'measure' ? 'Goal (optional)' : 'Target'}
              </label>
              <input
                id="habit-target"
                className="field__input field__input--num"
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={form.target}
                onChange={(e) => set({ target: e.target.value })}
                placeholder={form.kind === 'count' ? '3' : '185'}
              />
              <label className="field__label" htmlFor="habit-unit">
                Unit
              </label>
              <input
                id="habit-unit"
                className="field__input field__input--unit"
                value={form.unit}
                onChange={(e) => set({ unit: e.target.value })}
                placeholder={form.kind === 'count' ? 'walks' : 'g'}
                maxLength={12}
              />
            </div>
          )}

          <fieldset className="field">
            <legend className="field__label">When it’s due</legend>
            <div className="segmented">
              {[
                ['daily', 'Every day'],
                ['weekdays', 'Certain days'],
                ['per_week', 'Times a week'],
              ].map(([id, label]) => (
                <label key={id} className={`segmented__item ${form.cadence === id ? 'is-on' : ''}`}>
                  <input
                    type="radio"
                    name="cadence"
                    value={id}
                    checked={form.cadence === id}
                    onChange={() => set({ cadence: id })}
                  />
                  {label}
                </label>
              ))}
            </div>

            {form.cadence === 'weekdays' && (
              <div className="weekdays">
                {WEEKDAY_INITIALS.map((initial, i) => (
                  <button
                    type="button"
                    key={WEEKDAY_LABELS[i]}
                    className={`weekday ${form.weekdays.includes(i) ? 'is-on' : ''}`}
                    onClick={() => toggleWeekday(i)}
                    aria-pressed={form.weekdays.includes(i)}
                  >
                    <span aria-hidden="true">{initial}</span>
                    <span className="visually-hidden">{WEEKDAY_LABELS[i]}</span>
                  </button>
                ))}
              </div>
            )}

            {form.cadence === 'per_week' && (
              <div className="perweek">
                <input
                  type="range"
                  min="1"
                  max="7"
                  value={form.perWeek}
                  onChange={(e) => set({ perWeek: e.target.value })}
                  aria-label="Times a week"
                />
                <output>{form.perWeek}× a week</output>
              </div>
            )}
          </fieldset>
        </div>

        <footer className="sheet__foot">
          {habit && (
            <button type="button" className="btn btn--danger" onClick={onDelete}>
              Delete
            </button>
          )}
          <button type="submit" className="btn btn--primary" disabled={!canSave}>
            {habit ? 'Save changes' : 'Add habit'}
          </button>
        </footer>
      </form>
    </div>
  );
}
