/**
 * Food totals and the per-meal foods JENO mirrors from MyFitnessPal.
 * Pure helpers shared by the ingest API and the life OS screens.
 */

const MEAL_RANK = {
  breakfast: 0,
  lunch: 1,
  dinner: 2,
  snack: 3,
  snacks: 3,
};

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : 0;
}

export function sumFoods(foods = []) {
  return foods.reduce(
    (total, food) => ({
      calories: num(total.calories + num(food?.calories)),
      protein: num(total.protein + num(food?.protein)),
      carbs: num(total.carbs + num(food?.carbs)),
      fat: num(total.fat + num(food?.fat)),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

export function sumMeals(meals = []) {
  return sumFoods(meals);
}

function mealRank(name) {
  const key = String(name || '').trim().toLowerCase();
  return MEAL_RANK[key] ?? 4;
}

function foodLine(food, mealName) {
  return {
    name: String(food?.name || 'Food').trim() || 'Food',
    calories: num(food?.calories),
    protein: num(food?.protein),
    carbs: num(food?.carbs),
    fat: num(food?.fat),
    meal: mealName,
  };
}

/** Group flat `{ name, meal, calories, protein, carbs, fat }` rows into meals. */
export function groupFoodEntries(entries = []) {
  const groups = new Map();
  for (const entry of entries) {
    const meal = String(entry?.meal || 'Meal').trim() || 'Meal';
    if (!groups.has(meal)) groups.set(meal, []);
    groups.get(meal).push(foodLine(entry, meal));
  }
  return [...groups.entries()]
    .map(([name, foods]) => ({
      name,
      ...sumFoods(foods),
      foods: foods.map((food) => ({
        name: food.name,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
      })),
    }))
    .sort((a, b) => mealRank(a.name) - mealRank(b.name) || a.name.localeCompare(b.name));
}

/**
 * Append foods onto meals that already list foods. Meal rows with no foods
 * stay as their own lines so a total is not added twice.
 */
export function mergeMealLists(base = [], extra = []) {
  const foods = [];
  const bare = [];
  for (const meal of [...base, ...extra]) {
    if (!meal || typeof meal !== 'object') continue;
    const name = String(meal.name || meal.label || meal.slot || 'Meal').trim() || 'Meal';
    if (Array.isArray(meal.foods) && meal.foods.length) {
      for (const food of meal.foods) foods.push(foodLine({ ...food, meal: food.meal || name }, name));
    } else {
      bare.push({
        name,
        calories: num(meal.calories),
        protein: num(meal.protein),
        carbs: num(meal.carbs),
        fat: num(meal.fat),
      });
    }
  }
  const grouped = groupFoodEntries(foods);
  const bareSorted = bare.sort((a, b) => mealRank(a.name) - mealRank(b.name) || a.name.localeCompare(b.name));
  return [...grouped, ...bareSorted];
}

/**
 * Apply one ingest payload onto the stored day.
 * `foodMode` `totals-only` updates macros and leaves foods in place.
 */
export function applyNutritionWrite(existing, value) {
  const incoming = Array.isArray(value?.meals) ? value.meals : [];
  let meals;
  if (value?.foodMode === 'totals-only') meals = Array.isArray(existing?.meals) ? existing.meals : [];
  else if (value?.mode === 'append') meals = mergeMealLists(existing?.meals || [], incoming);
  else meals = incoming;

  const sums = sumMeals(meals);
  const explicit = value?.explicit || {};
  const pick = (key) => {
    if (explicit[key]) return num(value[key]);
    if (meals.length) return sums[key];
    return num(value?.[key]);
  };
  return {
    calories: pick('calories'),
    protein: pick('protein'),
    carbs: pick('carbs'),
    fat: pick('fat'),
    meals,
  };
}

function mealTitle(meal) {
  return String(meal?.name || meal?.label || meal?.title || meal?.slot || 'Meal').trim() || 'Meal';
}

/** Shape either ingest meals or the in-app diary into rows the screen can render. */
export function presentMeals(entry) {
  const meals = Array.isArray(entry?.meals) ? entry.meals : [];
  return meals
    .map((meal) => {
      const foods = (Array.isArray(meal?.foods) ? meal.foods : [])
        .filter((food) => food && !food.deleted)
        .map((food) => ({
          name: String(food.name || 'Food').trim() || 'Food',
          calories: num(food.calories),
          protein: num(food.protein),
          carbs: num(food.carbs),
          fat: num(food.fat),
        }));
      return {
        name: mealTitle(meal),
        calories: num(meal?.calories),
        protein: num(meal?.protein),
        carbs: num(meal?.carbs),
        fat: num(meal?.fat),
        foods,
      };
    })
    .filter((meal) => meal.foods.length || meal.calories || meal.protein || meal.carbs || meal.fat);
}

export function foodCount(entry) {
  return presentMeals(entry).reduce((sum, meal) => sum + (meal.foods.length || (meal.calories ? 1 : 0)), 0);
}

export function formatMacro(value, digits = 0) {
  const n = num(value);
  if (digits === 0) return String(Math.round(n));
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
