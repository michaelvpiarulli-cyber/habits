import { useEffect, useMemo, useRef, useState } from 'react';
import { useData } from '../context/DataProvider';
import {
  MACRO_FIELDS,
  defaultMealsForEditor,
  mealTitle,
  macrosAreEmpty,
  summarizeMeals,
  withFoodQuantity,
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

const applyFoodsToDraft = (draft, foods) => {
  const totaled = withMealFoodTotals({
    ...draft,
    foods,
    note: foods.map((f) => f.name).join(', '),
  });
  return {
    ...draft,
    foods: totaled.foods,
    note: totaled.note,
    ...Object.fromEntries(
      MACRO_FIELDS.map(({ id }) => [id, totaled[id] > 0 ? String(totaled[id]) : ''])
    ),
  };
};

const firstOpenMealId = (drafts) => {
  const empty = drafts.find(
    (draft) => macrosAreEmpty(draftToMeal(draft)) && !(draft.foods && draft.foods.length)
  );
  return (empty || drafts[0])?.id ?? null;
};

/**
 * Log food as meals through the day. Type a food name to pull calories/macros
 * from the built-in catalog + USDA. Day totals still roll up for Protein.
 *
 * `standalone` is used on the Calories tab — diary is always open, meals are
 * flat sections, and food edits autosave.
 */
export function NutritionTracker({ day, standalone = false }) {
  const { activeHabits, nutritionFor, saveMeals, setValue } = useData();
  const entry = useMemo(() => nutritionFor(day), [nutritionFor, day]);
  const hasData = entry.meals.some(
    (meal) => !macrosAreEmpty(meal) || (meal.foods && meal.foods.length)
  );
  const [open, setOpen] = useState(standalone || hasData);
  const [drafts, setDrafts] = useState(() => defaultMealsForEditor(entry.meals).map(asDraft));
  const [activeId, setActiveId] = useState(() =>
    standalone ? firstOpenMealId(defaultMealsForEditor(entry.meals).map(asDraft)) : null
  );
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const skipEntrySync = useRef(false);
  const autosaveTimer = useRef(null);

  useEffect(() => {
    if (standalone) setOpen(true);
  }, [standalone, day]);

  useEffect(() => {
    if (skipEntrySync.current) {
      skipEntrySync.current = false;
      return;
    }
    const formHasFocus = document.activeElement?.closest('.nutrition__form');
    if (!formHasFocus) {
      const next = defaultMealsForEditor(entry.meals).map(asDraft);
      setDrafts(next);
      setSaved(false);
      setDirty(false);
      if (standalone) setActiveId(firstOpenMealId(next));
    }
  }, [entry, standalone]);

  useEffect(
    () => () => {
      if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    },
    []
  );

  const syncProtein = (meals) => {
    const proteinHabit = activeHabits.find(
      (habit) => habit.kind === 'amount' && /protein/i.test(habit.name)
    );
    if (!proteinHabit) return;
    const protein = meals.reduce((sum, meal) => sum + (Number(meal.protein) || 0), 0);
    setValue(proteinHabit, day, protein);
  };

  const persist = (nextDrafts, { fromAutosave = false } = {}) => {
    const meals = nextDrafts.map(draftToMeal);
    skipEntrySync.current = true;
    const savedDay = saveMeals(day, meals);
    syncProtein(savedDay.meals);
    setDrafts(defaultMealsForEditor(savedDay.meals).map(asDraft));
    setSaved(true);
    setDirty(false);
    if (fromAutosave) {
      window.setTimeout(() => setSaved(false), 1400);
    }
  };

  const queueAutosave = (nextDrafts) => {
    if (!standalone) return;
    if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    autosaveTimer.current = window.setTimeout(() => {
      persist(nextDrafts, { fromAutosave: true });
    }, 380);
  };

  const commitDrafts = (updater, { immediate = false } = {}) => {
    setDrafts((current) => {
      const next = typeof updater === 'function' ? updater(current) : updater;
      if (standalone) {
        if (immediate) {
          if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
          queueMicrotask(() => persist(next, { fromAutosave: true }));
        } else {
          queueAutosave(next);
        }
      }
      return next;
    });
    setDirty(true);
    setSaved(false);
  };

  const updateDraft = (id, patch) => {
    commitDrafts((current) =>
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
  };

  const addFood = (mealId, food) => {
    commitDrafts(
      (current) =>
        current.map((draft) => {
          if (draft.id !== mealId) return draft;
          const quantity = food.quantity ?? 1;
          const foods = [
            ...(draft.foods || []),
            withFoodQuantity(
              {
                id: newId(),
                name: food.name,
                brand: food.brand || '',
                serving: food.serving || '1 serving',
                fdcId: food.fdcId || null,
                source: food.source || '',
                baseCalories: food.baseCalories ?? food.calories,
                baseProtein: food.baseProtein ?? food.protein,
                baseCarbs: food.baseCarbs ?? food.carbs,
                baseFat: food.baseFat ?? food.fat,
                calories: food.baseCalories ?? food.calories,
                protein: food.baseProtein ?? food.protein,
                carbs: food.baseCarbs ?? food.carbs,
                fat: food.baseFat ?? food.fat,
              },
              quantity
            ),
          ];
          return applyFoodsToDraft(draft, foods);
        }),
      { immediate: true }
    );
    setActiveId(mealId);
  };

  const setFoodQuantity = (mealId, foodId, quantity) => {
    commitDrafts(
      (current) =>
        current.map((draft) => {
          if (draft.id !== mealId) return draft;
          const foods = (draft.foods || []).map((food) =>
            food.id === foodId ? withFoodQuantity(food, quantity) : food
          );
          return applyFoodsToDraft(draft, foods);
        }),
      { immediate: true }
    );
  };

  const removeFood = (mealId, foodId) => {
    commitDrafts(
      (current) =>
        current.map((draft) => {
          if (draft.id !== mealId) return draft;
          const foods = (draft.foods || []).filter((food) => food.id !== foodId);
          return applyFoodsToDraft(draft, foods);
        }),
      { immediate: true }
    );
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
    commitDrafts((current) => [...current, snack], { immediate: false });
    setActiveId(snack.id);
  };

  const clearDay = () => {
    if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    saveMeals(day, []);
    syncProtein([]);
    const next = defaultMealsForEditor([]).map(asDraft);
    setDrafts(next);
    setActiveId(standalone ? firstOpenMealId(next) : null);
    setSaved(false);
    setDirty(false);
  };

  const summary = hasData
    ? `${entry.calories || 0} kcal · ${entry.protein || 0}g protein`
    : 'Type a food to pull calories';
  const mealLine = hasData ? summarizeMeals(entry.meals) : null;

  const showForm = standalone || open;
  const statusLabel = saved ? 'Saved' : dirty ? 'Saving…' : null;

  return (
    <section
      className={`nutrition ${hasData ? 'has-data' : ''} ${standalone ? 'nutrition--page' : ''}`}
    >
      {!standalone && (
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
      )}

      {showForm && (
        <form
          className="nutrition__form"
          onSubmit={(event) => {
            event.preventDefault();
            if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
            persist(drafts);
          }}
        >
          {standalone && (
            <div className="nutrition__page-head">
              <h2 className="nutrition__page-title">Meals</h2>
              {statusLabel && <p className="nutrition__status">{statusLabel}</p>}
            </div>
          )}

          <ul className={`meals ${standalone ? 'meals--diary' : ''}`}>
            {drafts.map((draft) => {
              const meal = draftToMeal(draft);
              const title = mealTitle(meal, drafts.map(draftToMeal));
              const filled = !macrosAreEmpty(meal) || (meal.foods && meal.foods.length > 0);
              const expanded = standalone || activeId === draft.id;
              const hasFoods = (draft.foods || []).length > 0;

              return (
                <li
                  key={draft.id}
                  className={`meal ${filled ? 'has-data' : ''} ${expanded ? 'is-open' : ''} ${
                    standalone ? 'meal--diary' : ''
                  }`}
                >
                  {standalone ? (
                    <div className="meal__head meal__head--static">
                      <span>
                        <span className="meal__name">{title}</span>
                        <span className="meal__summary">
                          {filled
                            ? `${meal.calories || 0} kcal · ${meal.protein || 0}g protein`
                            : 'Nothing logged yet'}
                        </span>
                      </span>
                    </div>
                  ) : (
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
                  )}

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
                        placeholder="e.g. 3 eggs, chicken breast…"
                        onPick={(food) => addFood(draft.id, food)}
                      />

                      {hasFoods && (
                        <ul className="food-lines">
                          {draft.foods.map((food) => (
                            <li key={food.id} className="food-line">
                              <span className="food-line__main">
                                <span className="food-line__name">{food.name}</span>
                                <span className="food-line__meta">
                                  {(food.quantity ?? 1) !== 1
                                    ? `${food.quantity} × ${food.serving || 'serving'}`
                                    : food.serving || '1 serving'}{' '}
                                  · {food.calories || 0} kcal
                                </span>
                              </span>
                              <div className="food-line__qty">
                                <button
                                  type="button"
                                  className="food-line__step"
                                  aria-label={`Fewer ${food.name}`}
                                  onClick={() =>
                                    setFoodQuantity(
                                      draft.id,
                                      food.id,
                                      Math.max(0.25, (Number(food.quantity) || 1) - 1)
                                    )
                                  }
                                >
                                  −
                                </button>
                                <label>
                                  <span className="visually-hidden">How many</span>
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    min="0.25"
                                    max="99"
                                    step="1"
                                    value={food.quantity ?? 1}
                                    aria-label={`How many ${food.name}`}
                                    onChange={(event) =>
                                      setFoodQuantity(draft.id, food.id, event.target.value)
                                    }
                                  />
                                </label>
                                <button
                                  type="button"
                                  className="food-line__step"
                                  aria-label={`More ${food.name}`}
                                  onClick={() =>
                                    setFoodQuantity(
                                      draft.id,
                                      food.id,
                                      Math.min(99, (Number(food.quantity) || 1) + 1)
                                    )
                                  }
                                >
                                  +
                                </button>
                              </div>
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

                      {/* On the Calories tab, keep empty meals light — search only.
                          Manual note/macros stay available on the Today embed, or once food is in. */}
                      {!hasFoods && !standalone && (
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

                      {(!standalone || filled) && (
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
                      )}
                      {hasFoods && (
                        <p className="field__hint">
                          Type “3 eggs” or tap + / − to change how many. Calories scale with the
                          count.
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <div className={`nutrition__actions ${standalone ? 'nutrition__actions--page' : ''}`}>
            {!standalone && (
              <button type="submit" className="btn btn--primary">
                {saved ? 'Saved' : 'Save meals'}
              </button>
            )}
            {standalone && dirty && !saved && (
              <button type="submit" className="btn btn--primary">
                Save now
              </button>
            )}
            <button type="button" className="btn" onClick={addSnack}>
              Add snack
            </button>
            {hasData && (
              <button type="button" className="btn" onClick={clearDay}>
                Clear day
              </button>
            )}
          </div>
          {!standalone && (
            <p className="field__hint">
              Type a food to pull calories. Totals still feed the Protein habit.
            </p>
          )}
          {standalone && (
            <p className="field__hint">
              Changes save as you go. Day totals still feed the Protein habit.
            </p>
          )}
        </form>
      )}
    </section>
  );
}
