/**
 * Meals for a day, with macros rolled up into the day totals the rest of the
 * app already reads (protein habit, Record trends, export).
 *
 * Older installs only stored day totals. Those become one "Earlier log" meal
 * the first time the record is normalized, so nothing disappears.
 *
 * Meals can hold individual `foods` (from search). When present, meal macros
 * are the sum of those foods — MyFitnessPal-style logging.
 */

export const MACRO_FIELDS = [
  { id: 'calories', label: 'Calories', unit: 'kcal', step: 10 },
  { id: 'protein', label: 'Protein', unit: 'g', step: 1 },
  { id: 'carbs', label: 'Carbs', unit: 'g', step: 1 },
  { id: 'fat', label: 'Fat', unit: 'g', step: 1 },
];

export const MEAL_SLOTS = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
  { id: 'snack', label: 'Snack' },
];

const SLOT_ORDER = { breakfast: 0, lunch: 1, dinner: 2, snack: 3, day: 4 };

const emptyMacros = () => ({ calories: 0, protein: 0, carbs: 0, fat: 0 });

export function clampMacros(fields = {}) {
  return {
    calories: Math.max(0, Number(fields.calories) || 0),
    protein: Math.max(0, Number(fields.protein) || 0),
    carbs: Math.max(0, Number(fields.carbs) || 0),
    fat: Math.max(0, Number(fields.fat) || 0),
  };
}

export function macrosAreEmpty(macros) {
  return MACRO_FIELDS.every(({ id }) => !(Number(macros?.[id]) > 0));
}

export function sumMacros(items) {
  return (items || []).reduce((totals, item) => {
    const macros = clampMacros(item);
    return {
      calories: totals.calories + macros.calories,
      protein: totals.protein + macros.protein,
      carbs: totals.carbs + macros.carbs,
      fat: totals.fat + macros.fat,
    };
  }, emptyMacros());
}

export function normalizeFood(food = {}) {
  return {
    id: food.id,
    name: food.name || '',
    brand: food.brand || '',
    serving: food.serving || '',
    fdcId: food.fdcId || null,
    source: food.source || '',
    ...clampMacros(food),
  };
}

export function foodsFromMeal(meal) {
  if (!meal) return [];
  if (Array.isArray(meal.foods) && meal.foods.length) {
    return meal.foods.map(normalizeFood).filter((food) => food.name || !macrosAreEmpty(food));
  }
  return [];
}

/** Roll meal macros from foods when the list is present. */
export function withMealFoodTotals(meal) {
  const foods = foodsFromMeal(meal);
  if (foods.length === 0) {
    return {
      ...meal,
      foods: [],
      ...clampMacros(meal),
    };
  }
  const totals = sumMacros(foods);
  const note =
    meal.note ||
    foods
      .map((food) => food.name)
      .filter(Boolean)
      .join(', ');
  return {
    ...meal,
    foods,
    note,
    ...totals,
  };
}

export function mealTitle(meal, meals = []) {
  if (meal.label) return meal.label;
  if (meal.slot === 'day') return 'Earlier log';
  const known = MEAL_SLOTS.find((item) => item.id === meal.slot);
  if (!known) return 'Meal';
  if (meal.slot !== 'snack') return known.label;
  const snacks = meals.filter((item) => item.slot === 'snack');
  if (snacks.length <= 1) return 'Snack';
  return `Snack ${snacks.findIndex((item) => item.id === meal.id) + 1}`;
}

/** Stable empty day shape used when nothing is logged. */
export function emptyNutritionDay(day) {
  return {
    day,
    ...emptyMacros(),
    meals: [],
  };
}

export function sortMeals(meals) {
  return [...(meals || [])].sort((a, b) => {
    const slotDiff = (SLOT_ORDER[a.slot] ?? 9) - (SLOT_ORDER[b.slot] ?? 9);
    if (slotDiff !== 0) return slotDiff;
    return String(a.id).localeCompare(String(b.id));
  });
}

/**
 * Ensure meals[] exists and day totals match. Legacy day-only rows become one
 * meal so the UI can edit them without losing history.
 */
export function normalizeNutritionEntry(entry, { inventLegacyMeal = true } = {}) {
  if (!entry) return null;
  const macros = clampMacros(entry);
  let meals = Array.isArray(entry.meals)
    ? entry.meals
        .filter((meal) => meal && !meal.deleted)
        .map((meal) =>
          withMealFoodTotals({
            id: meal.id,
            slot: meal.slot || 'snack',
            label: meal.label || '',
            note: meal.note || '',
            foods: Array.isArray(meal.foods) ? meal.foods : [],
            ...clampMacros(meal),
          })
        )
    : [];

  if (meals.length === 0 && inventLegacyMeal && !macrosAreEmpty(macros)) {
    meals = [
      {
        id: entry.id ? `legacy-${entry.id}` : 'legacy-day',
        slot: 'day',
        label: 'Earlier log',
        note: '',
        foods: [],
        ...macros,
      },
    ];
  }

  const totals = meals.length ? sumMacros(meals) : macros;
  return {
    ...entry,
    ...totals,
    meals: sortMeals(meals),
  };
}

/** Placeholder rows so Breakfast / Lunch / Dinner / Snack always appear. */
export function defaultMealsForEditor(meals) {
  const list = sortMeals(meals).map((meal) => withMealFoodTotals({ ...meal }));
  const present = new Set(list.map((meal) => meal.slot));

  for (const slot of MEAL_SLOTS) {
    if (slot.id === 'snack') continue;
    if (!present.has(slot.id)) {
      list.push({
        id: `slot-${slot.id}`,
        slot: slot.id,
        label: '',
        note: '',
        foods: [],
        ...emptyMacros(),
        placeholder: true,
      });
    }
  }

  if (!list.some((meal) => meal.slot === 'snack' || meal.slot === 'day')) {
    list.push({
      id: 'slot-snack',
      slot: 'snack',
      label: '',
      note: '',
      foods: [],
      ...emptyMacros(),
      placeholder: true,
    });
  }

  return sortMeals(list);
}

export function compactMeals(meals) {
  return sortMeals(meals)
    .map((meal) => withMealFoodTotals(meal))
    .filter(
      (meal) =>
        !macrosAreEmpty(meal) || meal.note || meal.label || (meal.foods && meal.foods.length)
    );
}

export function summarizeMeals(meals) {
  const logged = compactMeals(meals);
  if (logged.length === 0) return 'Log breakfast, lunch, dinner, and snacks';
  const names = logged.map((meal) => mealTitle(meal, logged));
  return names.join(' · ');
}
