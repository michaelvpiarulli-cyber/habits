import { useEffect, useMemo, useState } from 'react';
import { useData } from '../context/DataProvider';
import {
  MACRO_FIELDS,
  defaultMealsForEditor,
  mealTitle,
  macrosAreEmpty,
  summarizeMeals,
} from '../lib/nutrition';
import { newId } from '../lib/mappers';

const asDraft = (meal) => ({
  id: meal.id,
  slot: meal.slot,
  label: meal.label || '',
  note: meal.note || '',
  ...Object.fromEntries(
    MACRO_FIELDS.map(({ id }) => [id, meal[id] > 0 ? String(meal[id]) : ''])
  ),
});

const draftToMeal = (draft) => ({
  id: draft.id,
  slot: draft.slot,
  label: draft.label.trim(),
  note: draft.note.trim(),
  ...Object.fromEntries(
    MACRO_FIELDS.map(({ id }) => [id, Math.max(0, Number(draft[id]) || 0)])
  ),
});

/**
 * Log food as meals through the day. Day totals still roll up for the Protein
 * habit and any charts that read nutritionFor(day).
 */
export function NutritionTracker({ day }) {
  const { activeHabits, nutritionFor, saveMeals, setValue } = useData();
  const entry = useMemo(() => nutritionFor(day), [nutritionFor, day]);
  const hasData = entry.meals.some((meal) => !macrosAreEmpty(meal));
  const [open, setOpen] = useState(hasData);
  const [drafts, setDrafts] = useState(() => defaultMealsForEditor(entry.meals).map(asDraft));
  const [activeId, setActiveId] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const formHasFocus = document.activeElement?.closest('.nutrition__form');
    if (!formHasFocus) {
      setDrafts(defaultMealsForEditor(entry.meals).map(asDraft));
      setSaved(false);
    }
  }, [entry]);

  const syncProtein = (meals) => {
    const proteinHabit = activeHabits.find(
      (habit) => habit.kind === 'amount' && /protein/i.test(habit.name)
    );
    if (!proteinHabit) return;
    const protein = meals.reduce((sum, meal) => sum + (Number(meal.protein) || 0), 0);
    setValue(proteinHabit, day, protein);
  };

  const persist = (nextDrafts) => {
    const meals = nextDrafts.map(draftToMeal);
    const savedDay = saveMeals(day, meals);
    syncProtein(savedDay.meals);
    setDrafts(defaultMealsForEditor(savedDay.meals).map(asDraft));
    setSaved(true);
  };

  const updateDraft = (id, patch) => {
    setDrafts((current) => current.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)));
    setSaved(false);
  };

  const addSnack = () => {
    const snack = asDraft({
      id: newId(),
      slot: 'snack',
      label: '',
      note: '',
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    });
    setDrafts((current) => [...current, snack]);
    setActiveId(snack.id);
    setSaved(false);
  };

  const clearDay = () => {
    saveMeals(day, []);
    syncProtein([]);
    setDrafts(defaultMealsForEditor([]).map(asDraft));
    setActiveId(null);
    setSaved(false);
  };

  const summary = hasData
    ? `${entry.calories || 0} kcal · ${entry.protein || 0}g protein`
    : 'Breakfast, lunch, dinner, and snacks';
  const mealLine = hasData ? summarizeMeals(entry.meals) : null;

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
          <span className="nutrition__name">Food diary</span>
          <span className="nutrition__summary">{summary}</span>
          {mealLine && <span className="nutrition__meals">{mealLine}</span>}
        </span>
        <span className="nutrition__toggle" aria-hidden="true">
          {open ? '−' : '+'}
        </span>
      </button>

      {open && (
        <form
          className="nutrition__form"
          onSubmit={(event) => {
            event.preventDefault();
            persist(drafts);
          }}
        >
          <ul className="meals">
            {drafts.map((draft) => {
              const meal = draftToMeal(draft);
              const title = mealTitle(meal, drafts.map(draftToMeal));
              const filled = !macrosAreEmpty(meal);
              const expanded = activeId === draft.id;

              return (
                <li key={draft.id} className={`meal ${filled ? 'has-data' : ''} ${expanded ? 'is-open' : ''}`}>
                  <button
                    type="button"
                    className="meal__head"
                    onClick={() => setActiveId((id) => (id === draft.id ? null : draft.id))}
                    aria-expanded={expanded}
                  >
                    <span>
                      <span className="meal__name">{title}</span>
                      <span className="meal__summary">
                        {filled
                          ? `${meal.calories || 0} kcal · ${meal.protein || 0}g protein`
                          : 'Not logged'}
                      </span>
                    </span>
                    <span className="meal__toggle" aria-hidden="true">
                      {expanded ? '−' : '+'}
                    </span>
                  </button>

                  {expanded && (
                    <div className="meal__body">
                      {(draft.slot === 'snack' || draft.slot === 'day') && (
                        <label className="nutrition__field">
                          <span className="nutrition__label">Label</span>
                          <span className="nutrition__control">
                            <input
                              type="text"
                              value={draft.label}
                              placeholder={draft.slot === 'day' ? 'Earlier log' : 'Afternoon snack'}
                              maxLength={40}
                              onChange={(event) => updateDraft(draft.id, { label: event.target.value })}
                            />
                          </span>
                        </label>
                      )}

                      <label className="nutrition__field">
                        <span className="nutrition__label">What you ate</span>
                        <span className="nutrition__control nutrition__control--wide">
                          <input
                            type="text"
                            value={draft.note}
                            placeholder="Eggs, oats, coffee…"
                            maxLength={80}
                            onChange={(event) => updateDraft(draft.id, { note: event.target.value })}
                          />
                        </span>
                      </label>

                      <div className="nutrition__grid">
                        {MACRO_FIELDS.map(({ id, label, unit, step }) => (
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
                                onChange={(event) => updateDraft(draft.id, { [id]: event.target.value })}
                              />
                              <span>{unit}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="nutrition__actions">
            <button type="submit" className="btn btn--primary">
              {saved ? 'Saved' : 'Save meals'}
            </button>
            <button type="button" className="btn" onClick={addSnack}>
              Add snack
            </button>
            {hasData && (
              <button type="button" className="btn" onClick={clearDay}>
                Clear day
              </button>
            )}
          </div>
          <p className="field__hint">
            Log as you eat. Totals still feed the Protein habit — the day number is just the sum of
            the meals.
          </p>
        </form>
      )}
    </section>
  );
}
