import { useEffect, useMemo, useState } from 'react';
import { useData } from '../context/DataProvider';
import {
  MACRO_FIELDS,
  defaultMealsForEditor,
  mealTitle,
  macrosAreEmpty,
  summarizeMeals,
  withMealFoodTotals,
} from '../lib/nutrition';
import { newId } from '../lib/mappers';
import { FoodSearch } from './FoodSearch';

const asDraft = (meal) => {
  const normalized = withMealFoodTotals(meal);
  return {
    id: normalized.id,
    slot: normalized.slot,
    label: normalized.label || '',
    note: normalized.note || '',
    foods: Array.isArray(normalized.foods) ? normalized.foods : [],
    ...Object.fromEntries(
      MACRO_FIELDS.map(({ id }) => [id, normalized[id] > 0 ? String(normalized[id]) : ''])
    ),
  };
};

const draftToMeal = (draft) => {
  const base = {
    id: draft.id,
    slot: draft.slot,
    label: (draft.label || '').trim(),
    note: (draft.note || '').trim(),
    foods: Array.isArray(draft.foods) ? draft.foods : [],
    ...Object.fromEntries(
      MACRO_FIELDS.map(({ id }) => [id, Math.max(0, Number(draft[id]) || 0)])
    ),
  };
  return withMealFoodTotals(base);
};

/**
 * Log food as meals through the day. Type a food name to pull calories/macros
 * from the built-in catalog + USDA. Day totals still roll up for Protein.
 */
export function NutritionTracker({ day }) {
  const { activeHabits, nutritionFor, saveMeals, setValue } = useData();
  const entry = useMemo(() => nutritionFor(day), [nutritionFor, day]);
  const hasData = entry.meals.some(
    (meal) => !macrosAreEmpty(meal) || (meal.foods && meal.foods.length)
  );
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
    setDrafts((current) =>
      current.map((draft) => {
        if (draft.id !== id) return draft;
        const next = { ...draft, ...patch };
        if (patch.foods) {
          const totaled = withMealFoodTotals(next);
          return {
            ...next,
            foods: totaled.foods,
            note: totaled.note,
            ...Object.fromEntries(
              MACRO_FIELDS.map(({ id: key }) => [
                key,
                totaled[key] > 0 ? String(totaled[key]) : '',
              ])
            ),
          };
        }
        return next;
      })
    );
    setSaved(false);
  };

  const addFood = (mealId, food) => {
    setDrafts((current) =>
      current.map((draft) => {
        if (draft.id !== mealId) return draft;
        const foods = [
          ...(draft.foods || []),
          {
            id: newId(),
            name: food.name,
            brand: food.brand || '',
            serving: food.serving || '',
            fdcId: food.fdcId || null,
            source: food.source || '',
            calories: food.calories,
            protein: food.protein,
            carbs: food.carbs,
            fat: food.fat,
          },
        ];
        const totaled = withMealFoodTotals({ ...draft, foods });
        return {
          ...draft,
          foods: totaled.foods,
          note: totaled.note,
          ...Object.fromEntries(
            MACRO_FIELDS.map(({ id }) => [id, totaled[id] > 0 ? String(totaled[id]) : ''])
          ),
        };
      })
    );
    setSaved(false);
  };

  const removeFood = (mealId, foodId) => {
    setDrafts((current) =>
      current.map((draft) => {
        if (draft.id !== mealId) return draft;
        const foods = (draft.foods || []).filter((food) => food.id !== foodId);
        const totaled = withMealFoodTotals({
          ...draft,
          foods,
          note: foods.map((f) => f.name).join(', '),
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        });
        return {
          ...draft,
          foods: totaled.foods,
          note: totaled.note,
          ...Object.fromEntries(
            MACRO_FIELDS.map(({ id }) => [id, totaled[id] > 0 ? String(totaled[id]) : ''])
          ),
        };
      })
    );
    setSaved(false);
  };

  const addSnack = () => {
    const snack = asDraft({
      id: newId(),
      slot: 'snack',
      label: '',
      note: '',
      foods: [],
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
    : 'Type a food to pull calories';
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
              const filled = !macrosAreEmpty(meal) || (meal.foods && meal.foods.length > 0);
              const expanded = activeId === draft.id;
              const hasFoods = (draft.foods || []).length > 0;

              return (
                <li
                  key={draft.id}
                  className={`meal ${filled ? 'has-data' : ''} ${expanded ? 'is-open' : ''}`}
                >
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
                              onChange={(event) =>
                                updateDraft(draft.id, { label: event.target.value })
                              }
                            />
                          </span>
                        </label>
                      )}

                      <FoodSearch
                        placeholder="e.g. chicken breast, banana, oats…"
                        onPick={(food) => addFood(draft.id, food)}
                      />

                      {hasFoods && (
                        <ul className="food-lines">
                          {draft.foods.map((food) => (
                            <li key={food.id} className="food-line">
                              <span className="food-line__main">
                                <span className="food-line__name">{food.name}</span>
                                <span className="food-line__meta">
                                  {food.serving || '1 serving'} · {food.calories || 0} kcal
                                </span>
                              </span>
                              <button
                                type="button"
                                className="food-line__remove"
                                aria-label={`Remove ${food.name}`}
                                onClick={() => removeFood(draft.id, food.id)}
                              >
                                ×
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}

                      {!hasFoods && (
                        <label className="nutrition__field">
                          <span className="nutrition__label">Or note what you ate</span>
                          <span className="nutrition__control nutrition__control--wide">
                            <input
                              type="text"
                              value={draft.note}
                              placeholder="Eggs, oats, coffee…"
                              maxLength={80}
                              onChange={(event) =>
                                updateDraft(draft.id, { note: event.target.value })
                              }
                            />
                          </span>
                        </label>
                      )}

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
                                readOnly={hasFoods}
                                onChange={(event) =>
                                  updateDraft(draft.id, { [id]: event.target.value })
                                }
                              />
                              <span>{unit}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                      {hasFoods && (
                        <p className="field__hint">
                          Macros are the sum of the foods above. Remove a food to edit by hand.
                        </p>
                      )}
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
            Type a food to pull calories. Totals still feed the Protein habit.
          </p>
        </form>
      )}
    </section>
  );
}
