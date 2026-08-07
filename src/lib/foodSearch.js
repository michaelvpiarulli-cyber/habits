/**
 * Food search for the calorie diary — local common foods first, then USDA
 * FoodData Central so typing a name can pull calories/macros like MyFitnessPal.
 */

import { COMMON_FOODS } from './commonFoods.js';
import { mapUsdaFood } from './usdaFood.js';
import { clampQuantity, scaleFoodMacros } from './nutrition.js';

const USDA_SEARCH = 'https://api.nal.usda.gov/fdc/v1/foods/search';

/**
 * Pull a leading count out of "3 eggs", "2x chicken", "1/2 banana".
 * Returns the multiplier plus the food text to search.
 */
export function parseFoodQuery(raw) {
  const text = String(raw || '').trim();
  if (!text) return { quantity: 1, foodQuery: '' };

  const multi = text.match(/^(\d+(?:\.\d+)?)\s*[x×*]\s+(.+)$/i);
  if (multi) {
    return { quantity: clampQuantity(multi[1]), foodQuery: multi[2].trim() };
  }

  const spaced = text.match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
  if (spaced) {
    return { quantity: clampQuantity(spaced[1]), foodQuery: spaced[2].trim() };
  }

  const half = text.match(/^(1\/2|½)\s+(.+)$/);
  if (half) {
    return { quantity: 0.5, foodQuery: half[2].trim() };
  }

  return { quantity: 1, foodQuery: text };
}

function searchTerms(foodQuery) {
  const q = foodQuery.trim();
  if (!q) return [];
  const terms = [q];
  // "eggs" should still hit "Egg, large"
  if (q.length > 3 && /s$/i.test(q) && !/ss$/i.test(q)) {
    terms.push(q.replace(/s$/i, ''));
  }
  return terms;
}

function scoreLocal(food, query) {
  const q = query.toLowerCase();
  const name = food.name.toLowerCase();
  if (name === q) return 100;
  if (name.startsWith(q)) return 80;
  if (name.includes(q)) return 60;
  const parts = q.split(/\s+/).filter(Boolean);
  if (parts.every((part) => name.includes(part))) return 40;
  return 0;
}

export function searchLocalFoods(query, limit = 8) {
  const { foodQuery } = parseFoodQuery(query);
  const terms = searchTerms(foodQuery);
  if (terms.length === 0) return [];

  const best = new Map();
  for (const term of terms) {
    for (const food of COMMON_FOODS) {
      const score = scoreLocal(food, term);
      if (score <= 0) continue;
      const prev = best.get(food.id);
      if (!prev || score > prev.score) best.set(food.id, { food, score });
    }
  }

  return [...best.values()]
    .sort((a, b) => b.score - a.score || a.food.name.localeCompare(b.food.name))
    .slice(0, limit)
    .map(({ food }) => ({
      id: food.id,
      name: food.name,
      brand: food.brand,
      serving: food.serving,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      source: 'local',
    }));
}

function clientUsdaKey() {
  return import.meta.env?.VITE_USDA_API_KEY || 'DEMO_KEY';
}

/** Call USDA (or the deployed /api/food-search proxy). */
export async function searchUsdaFoods(query, { signal, limit = 8 } = {}) {
  const { foodQuery } = parseFoodQuery(query);
  const q = searchTerms(foodQuery)[0] || '';
  if (q.length < 2) return [];

  const useProxy =
    typeof window !== 'undefined' &&
    !import.meta.env?.DEV &&
    Boolean(window.location?.origin);

  const url = useProxy
    ? `/api/food-search?q=${encodeURIComponent(q)}&limit=${limit}`
    : `${USDA_SEARCH}?${new URLSearchParams({
        api_key: clientUsdaKey(),
        query: q,
        pageSize: String(limit),
        dataType: 'Survey (FNDDS),Foundation,SR Legacy,Branded',
      })}`;

  const res = await fetch(url, { signal });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Food search failed (${res.status})`);
  }
  const data = await res.json();
  if (Array.isArray(data.foods) && data.foods[0]?.name != null && data.foods[0]?.source) {
    return data.foods.slice(0, limit);
  }
  return (data.foods || [])
    .map(mapUsdaFood)
    .filter((food) => food.calories > 0 || food.protein > 0)
    .slice(0, limit);
}

/**
 * Local hits immediately; USDA fills in after. Dedupes by name.
 * Attaches `quantity` from the typed query (e.g. "3 eggs" → 3).
 */
export async function searchFoods(query, { signal, limit = 8 } = {}) {
  const { quantity } = parseFoodQuery(query);
  const local = searchLocalFoods(query, limit);
  let remote = [];
  try {
    remote = await searchUsdaFoods(query, { signal, limit });
  } catch {
    remote = [];
  }

  const seen = new Set(local.map((f) => f.name.toLowerCase()));
  const merged = [...local];
  for (const food of remote) {
    const key = food.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(food);
    if (merged.length >= limit) break;
  }
  return merged.map((food) => withSearchQuantity(food, quantity));
}

/** Scale preview macros for the typed count without losing the per-serving base. */
export function withSearchQuantity(food, quantity) {
  const q = clampQuantity(quantity);
  const base = {
    calories: food.calories,
    protein: food.protein,
    carbs: food.carbs,
    fat: food.fat,
  };
  // Incoming food macros are per 1 serving; scale the preview for the list.
  const scaled = q === 1 ? base : scaleFoodMacros(base, q);
  return {
    ...food,
    quantity: q,
    baseCalories: base.calories,
    baseProtein: base.protein,
    baseCarbs: base.carbs,
    baseFat: base.fat,
    ...scaled,
  };
}
