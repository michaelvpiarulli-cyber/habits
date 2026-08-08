/**
 * Recently / frequently logged foods — the thing that makes re-logging
 * faster than hunting MyFitnessPal’s diary.
 */

export const RECENT_FOODS_KEY = 'tally-recent-foods';
const MAX_RECENTS = 40;
const MAX_SHOW = 8;

function fingerprint(food = {}) {
  return [
    (food.name || '').trim().toLowerCase(),
    (food.brand || '').trim().toLowerCase(),
    (food.serving || '').trim().toLowerCase(),
    Math.round(Number(food.baseCalories ?? food.calories) || 0),
  ].join('|');
}

function normalizeStored(food) {
  const calories = Math.max(0, Number(food.baseCalories ?? food.calories) || 0);
  const protein = Math.max(0, Number(food.baseProtein ?? food.protein) || 0);
  const carbs = Math.max(0, Number(food.baseCarbs ?? food.carbs) || 0);
  const fat = Math.max(0, Number(food.baseFat ?? food.fat) || 0);
  return {
    key: fingerprint(food),
    name: food.name || '',
    brand: food.brand || '',
    serving: food.serving || '1 serving',
    fdcId: food.fdcId || null,
    source: food.source || 'recent',
    calories,
    protein,
    carbs,
    fat,
    baseCalories: calories,
    baseProtein: protein,
    baseCarbs: carbs,
    baseFat: fat,
    count: Math.max(1, Number(food.count) || 1),
    lastUsed: food.lastUsed || Date.now(),
  };
}

export function loadRecentFoods() {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_FOODS_KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw.map(normalizeStored).filter((food) => food.name);
  } catch {
    return [];
  }
}

export function rememberFood(food) {
  if (!food?.name) return loadRecentFoods();
  const nextItem = normalizeStored({ ...food, lastUsed: Date.now() });
  const prev = loadRecentFoods().filter((item) => item.key !== nextItem.key);
  const existing = loadRecentFoods().find((item) => item.key === nextItem.key);
  const merged = {
    ...nextItem,
    count: (existing?.count || 0) + 1,
  };
  const list = [merged, ...prev].slice(0, MAX_RECENTS);
  localStorage.setItem(RECENT_FOODS_KEY, JSON.stringify(list));
  return list;
}

/** Recents first, then frequent — for empty-search suggestions. */
export function suggestRecentFoods(limit = MAX_SHOW) {
  const list = loadRecentFoods();
  const byRecent = [...list].sort((a, b) => b.lastUsed - a.lastUsed);
  const byFrequent = [...list]
    .filter((item) => item.count >= 2)
    .sort((a, b) => b.count - a.count || b.lastUsed - a.lastUsed);

  const seen = new Set();
  const out = [];
  for (const food of [...byRecent.slice(0, 5), ...byFrequent]) {
    if (seen.has(food.key)) continue;
    seen.add(food.key);
    out.push({
      id: `recent-${food.key}`,
      name: food.name,
      brand: food.brand,
      serving: food.serving,
      fdcId: food.fdcId,
      source: 'recent',
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      baseCalories: food.baseCalories,
      baseProtein: food.baseProtein,
      baseCarbs: food.baseCarbs,
      baseFat: food.baseFat,
      quantity: 1,
      recentCount: food.count,
    });
    if (out.length >= limit) break;
  }
  return out;
}

/** Boost local search hits that you’ve logged before. */
export function recentBoost(food) {
  const key = fingerprint(food);
  const hit = loadRecentFoods().find((item) => item.key === key);
  if (!hit) return 0;
  return Math.min(40, 12 + hit.count * 4);
}

/** Which meal slot matches the clock — skips MyFitnessPal’s meal hunting. */
export function mealSlotForHour(hour = new Date().getHours()) {
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 16) return 'lunch';
  if (hour >= 16 && hour < 21) return 'dinner';
  return 'snack';
}
