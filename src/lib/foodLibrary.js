/**
 * Growing personal food library — every remote hit you see/log can be
 * re-searched offline later. This is how a 1,280-food starter kit scales
 * toward the million-food universe without bloating the app bundle.
 */

export const FOOD_LIBRARY_KEY = 'tally-food-library';
const MAX_LIBRARY = 5000;

function fingerprint(food = {}) {
  return [
    (food.name || '').trim().toLowerCase(),
    (food.brand || '').trim().toLowerCase(),
    (food.serving || '').trim().toLowerCase(),
    Math.round(Number(food.baseCalories ?? food.calories) || 0),
  ].join('|');
}

function normalize(food) {
  const calories = Math.max(0, Number(food.baseCalories ?? food.calories) || 0);
  const protein = Math.max(0, Number(food.baseProtein ?? food.protein) || 0);
  const carbs = Math.max(0, Number(food.baseCarbs ?? food.carbs) || 0);
  const fat = Math.max(0, Number(food.baseFat ?? food.fat) || 0);
  return {
    id: food.id || `lib-${fingerprint(food)}`,
    key: fingerprint(food),
    name: food.name || '',
    brand: food.brand || '',
    serving: food.serving || '1 serving',
    fdcId: food.fdcId || null,
    source: food.source || 'library',
    calories,
    protein,
    carbs,
    fat,
    baseCalories: calories,
    baseProtein: protein,
    baseCarbs: carbs,
    baseFat: fat,
    aliases: Array.isArray(food.aliases) ? food.aliases : [],
    savedAt: food.savedAt || Date.now(),
  };
}

export function loadFoodLibrary() {
  try {
    const raw = JSON.parse(localStorage.getItem(FOOD_LIBRARY_KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw.map(normalize).filter((food) => food.name);
  } catch {
    return [];
  }
}

export function rememberLibraryFoods(foods = []) {
  if (!Array.isArray(foods) || foods.length === 0) return loadFoodLibrary();
  const prev = loadFoodLibrary();
  const byKey = new Map(prev.map((food) => [food.key, food]));
  for (const food of foods) {
    if (!food?.name) continue;
    const next = normalize({ ...food, savedAt: Date.now() });
    byKey.set(next.key, { ...byKey.get(next.key), ...next });
  }
  const list = [...byKey.values()]
    .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0))
    .slice(0, MAX_LIBRARY);
  localStorage.setItem(FOOD_LIBRARY_KEY, JSON.stringify(list));
  return list;
}

/** Approximate searchable universe size (remote indexes + local). */
export const FOOD_UNIVERSE = {
  openFoodFacts: 3_500_000,
  usda: 400_000,
  /** Marketing / UI label — combined remote coverage. */
  label: '3.5M+',
  totalApprox: 3_900_000,
};
