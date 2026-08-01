import { useEffect, useMemo, useState } from 'react';
import { useData } from '../context/DataProvider';

const FIELDS = [
  { id: 'calories', label: 'Calories', unit: 'kcal', step: 10 },
  { id: 'protein', label: 'Protein', unit: 'g', step: 1 },
  { id: 'carbs', label: 'Carbs', unit: 'g', step: 1 },
  { id: 'fat', label: 'Fat', unit: 'g', step: 1 },
];

const asDraft = (entry) =>
  Object.fromEntries(FIELDS.map(({ id }) => [id, entry[id] > 0 ? String(entry[id]) : '']));

export function NutritionTracker({ day }) {
  const { activeHabits, nutritionFor, saveNutrition, setValue } = useData();
  const entry = useMemo(() => nutritionFor(day), [nutritionFor, day]);
  const hasData = FIELDS.some(({ id }) => entry[id] > 0);
  const [open, setOpen] = useState(hasData);
  const [draft, setDraft] = useState(() => asDraft(entry));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const formHasFocus = document.activeElement?.closest('.nutrition__form');
    if (!formHasFocus) setDraft(asDraft(entry));
  }, [entry]);

  const submit = (event) => {
    event.preventDefault();
    const values = Object.fromEntries(
      FIELDS.map(({ id }) => [id, Math.max(0, Number(draft[id]) || 0)])
    );
    saveNutrition(day, values);

    // Keep the existing Protein habit in step with the macro log so its streak,
    // progress grid, and perfect-day status continue to tell the truth.
    const proteinHabit = activeHabits.find(
      (habit) => habit.kind === 'amount' && /protein/i.test(habit.name)
    );
    if (proteinHabit) setValue(proteinHabit, day, values.protein);
    setSaved(true);
  };

  const summary = hasData
    ? `${entry.calories || 0} kcal · ${entry.protein || 0}g protein`
    : 'Calories, protein, carbs, and fat';

  return (
    <section className={`nutrition ${hasData ? 'has-data' : ''}`}>
      <button
        type="button"
        className="nutrition__head"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span>
          <span className="eyebrow">Today’s eating</span>
          <span className="nutrition__name">Macro tally</span>
          <span className="nutrition__summary">{summary}</span>
        </span>
        <span className="nutrition__toggle" aria-hidden="true">
          {open ? '−' : '+'}
        </span>
      </button>

      {open && (
        <form className="nutrition__form" onSubmit={submit}>
          <div className="nutrition__grid">
            {FIELDS.map(({ id, label, unit, step }) => (
              <label className="nutrition__field" key={id}>
                <span className="nutrition__label">{label}</span>
                <span className="nutrition__control">
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step={step}
                    value={draft[id]}
                    placeholder="0"
                    onChange={(event) => {
                      setDraft((current) => ({ ...current, [id]: event.target.value }));
                      setSaved(false);
                    }}
                  />
                  <span>{unit}</span>
                </span>
              </label>
            ))}
          </div>
          <div className="nutrition__actions">
            <button type="submit" className="btn btn--primary">
              {saved ? 'Saved' : 'Save macros'}
            </button>
            {hasData && (
              <button
                type="button"
                className="btn"
                onClick={() => {
                  const empty = asDraft({});
                  setDraft(empty);
                  saveNutrition(day, empty);
                  const proteinHabit = activeHabits.find(
                    (habit) => habit.kind === 'amount' && /protein/i.test(habit.name)
                  );
                  if (proteinHabit) setValue(proteinHabit, day, 0);
                  setSaved(false);
                }}
              >
                Clear
              </button>
            )}
          </div>
        </form>
      )}
    </section>
  );
}
