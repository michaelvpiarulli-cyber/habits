import { useEffect, useRef, useState } from 'react';

/** A step that suits the magnitude: 5 for grams, 0.5 for hours, 0.2 for pounds. */
function stepFor(habit) {
  if (habit.kind === 'measure') return habit.unit === 'lb' || habit.unit === 'kg' ? 0.2 : 0.5;
  const t = Number(habit.target) || 1;
  if (t >= 100) return 5;
  if (t >= 20) return 1;
  return 0.5;
}

const round = (n) => Math.round(n * 100) / 100;

/**
 * Inline number entry for amount and measure habits.
 *
 * It opens on the value you are most likely to want — today's if there is one,
 * otherwise your last reading — because weight and protein move in small steps
 * from yesterday, and retyping a nearly identical number every morning is the
 * kind of friction that ends a tracking habit.
 */
export function AmountEntry({ habit, value, suggestion, onSave, onClear, onCancel }) {
  const step = stepFor(habit);
  const [draft, setDraft] = useState(() => String(value || suggestion || habit.target || ''));
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const nudge = (delta) => {
    const next = Math.max(0, round((Number(draft) || 0) + delta));
    setDraft(String(next));
  };

  const commit = () => {
    const n = Number(draft);
    // An empty or zero entry means "I didn't do this after all", not "save a 0".
    if (!Number.isFinite(n) || n <= 0) onClear();
    else onSave(round(n));
  };

  const submit = (e) => {
    e.preventDefault();
    commit();
  };

  // Enter is handled outright rather than left to the form's implicit
  // submission: this input sits inside a list of habits, and on a phone the
  // return key is the obvious way to finish.
  const onKeyDown = (e) => {
    if (e.key === 'Escape') onCancel();
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    }
  };

  return (
    <form className="entry" onSubmit={submit}>
      <button type="button" className="entry__step" onClick={() => nudge(-step)} aria-label={`Down ${step}`}>
        &minus;
      </button>

      <div className="entry__field">
        <input
          ref={inputRef}
          type="number"
          inputMode="decimal"
          step="any"
          min="0"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          aria-label={`${habit.name} today${habit.unit ? ` in ${habit.unit}` : ''}`}
        />
        {habit.unit && <span className="entry__unit">{habit.unit}</span>}
      </div>

      <button type="button" className="entry__step" onClick={() => nudge(step)} aria-label={`Up ${step}`}>
        +
      </button>

      <button type="submit" className="entry__save">
        Save
      </button>
      {value > 0 && (
        <button type="button" className="entry__clear" onClick={onClear}>
          Clear
        </button>
      )}
    </form>
  );
}
