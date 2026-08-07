/**
 * Food search for the calorie diary — local common foods first, then USDA
 * FoodData Central so typing a name can pull calories/macros like MyFitnessPal.
 */

import { COMMON_FOODS } from './commonFoods.js';
import { mapUsdaFood } from './usdaFood.js';

const USDA_SEARCH = 'https://api.nal.usda.gov/fdc/v1/foods/search';

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
  const q = String(query || '').trim();
  if (q.length < 1) return [];
  return COMMON_FOODS.map((food) => ({ food, score: scoreLocal(food, q) }))
    .filter((row) => row.score > 0)
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
  const q = String(query || '').trim();
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
 */
export async function searchFoods(query, { signal, limit = 8 } = {}) {
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
  return merged;
}
