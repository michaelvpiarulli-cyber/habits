/**
 * Food search for the calorie diary — large local catalog first, then USDA
 * FoodData Central + Open Food Facts for branded items (Oikos, Chobani, etc.).
 */

import { COMMON_FOODS } from './commonFoods.js';
import { mapUsdaFood } from './usdaFood.js';
import { clampQuantity, scaleFoodMacros } from './nutrition.js';

const USDA_SEARCH = 'https://api.nal.usda.gov/fdc/v1/foods/search';
const OFF_SEARCH = 'https://world.openfoodfacts.org/cgi/search.pl';

export const DEFAULT_SEARCH_LIMIT = 12;

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

/** Shorthand people type in MFP-style loggers → expand into searchable terms. */
const QUERY_SYNONYMS = {
  pb: 'peanut butter',
  'greek yogurt': 'greek yogurt',
  cottage: 'cottage cheese',
  whey: 'whey protein',
  'protein powder': 'whey protein',
  mcd: "mcdonald's",
  mcdonalds: "mcdonald's",
  chickfila: 'chick-fil-a',
  'chick fil a': 'chick-fil-a',
  cfa: 'chick-fil-a',
  sbux: 'starbucks',
  tbell: 'taco bell',
  innout: 'in-n-out',
  'in n out': 'in-n-out',
  'jimmy johns': "jimmy john's",
  bww: 'buffalo wild wings',
  'jersey mikes': "jersey mike's",
  'papa johns': "papa john's",
  oj: 'orange juice',
};

function expandQuery(foodQuery) {
  const q = foodQuery.trim().toLowerCase();
  if (!q) return [];
  const expanded = new Set([foodQuery.trim()]);
  if (QUERY_SYNONYMS[q]) expanded.add(QUERY_SYNONYMS[q]);
  // Also expand when the synonym is a prefix/token of a longer query.
  for (const [key, value] of Object.entries(QUERY_SYNONYMS)) {
    if (key.length < 2) continue;
    if (q === key || q.startsWith(`${key} `) || q.endsWith(` ${key}`) || q.includes(` ${key} `)) {
      expanded.add(q.split(key).join(value));
      expanded.add(value);
    }
  }
  return [...expanded];
}

function searchTerms(foodQuery) {
  const bases = expandQuery(foodQuery);
  if (bases.length === 0) return [];
  const terms = new Set();
  for (const base of bases) {
    const q = base.trim();
    if (!q) continue;
    terms.add(q);
    if (q.length > 3 && /s$/i.test(q) && !/ss$/i.test(q)) {
      terms.add(q.replace(/s$/i, ''));
    }
  }
  return [...terms];
}

function haystack(food) {
  return [food.name, food.brand, ...(food.aliases || [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function scoreLocal(food, query) {
  const q = query.toLowerCase();
  const name = (food.name || '').toLowerCase();
  const brand = (food.brand || '').toLowerCase();
  const text = haystack(food);

  if (name === q || brand === q) return 120;
  if ((food.aliases || []).some((a) => String(a).toLowerCase() === q)) return 110;
  if (name.startsWith(q) || brand.startsWith(q)) return 90;
  if (name.includes(q) || brand.includes(q)) return 75;
  if (text.includes(q)) return 65;
  const parts = q.split(/\s+/).filter(Boolean);
  if (parts.length && parts.every((part) => text.includes(part))) return 50;
  return 0;
}

function rankRemote(food, query) {
  const q = query.toLowerCase();
  const name = (food.name || '').toLowerCase();
  const brand = (food.brand || '').toLowerCase();
  const text = `${name} ${brand}`;
  if (name === q || brand === q) return 100;
  if (name.startsWith(q) || brand.startsWith(q)) return 80;
  if (name.includes(q) || brand.includes(q)) return 60;
  const parts = q.split(/\s+/).filter(Boolean);
  if (parts.length && parts.every((part) => text.includes(part))) return 40;
  return 10;
}

export function searchLocalFoods(query, limit = DEFAULT_SEARCH_LIMIT) {
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

function round1(n) {
  return Math.round(Number(n) * 10) / 10;
}

export function mapOpenFoodFacts(product) {
  const n = product.nutriments || {};
  const hasServing =
    n['energy-kcal_serving'] != null ||
    n.energy_serving != null ||
    n.proteins_serving != null;

  let calories;
  let protein;
  let carbs;
  let fat;
  let serving = product.serving_size || '1 serving';

  if (hasServing) {
    calories = Number(n['energy-kcal_serving'] ?? n.energy_serving / 4.184) || 0;
    protein = Number(n.proteins_serving) || 0;
    carbs = Number(n.carbohydrates_serving) || 0;
    fat = Number(n.fat_serving) || 0;
  } else {
    // Fall back to per-100g as a single “serving” when label serving is missing.
    calories = Number(n['energy-kcal_100g'] ?? n.energy_100g / 4.184) || 0;
    protein = Number(n.proteins_100g) || 0;
    carbs = Number(n.carbohydrates_100g) || 0;
    fat = Number(n.fat_100g) || 0;
    serving = product.serving_size || '100 g';
  }

  const name = product.product_name || product.generic_name || 'Food';
  const brand = (product.brands || '').split(',')[0].trim() || 'Open Food Facts';
  const code = product.code || product._id || name;

  return {
    id: `off-${code}`,
    name: name.trim(),
    brand,
    serving,
    calories: Math.round(calories),
    protein: round1(protein),
    carbs: round1(carbs),
    fat: round1(fat),
    source: 'off',
  };
}

/** Call USDA (or the deployed /api/food-search proxy). Branded first for labels like Oikos. */
export async function searchUsdaFoods(query, { signal, limit = DEFAULT_SEARCH_LIMIT } = {}) {
  const { foodQuery } = parseFoodQuery(query);
  const q = searchTerms(foodQuery)[0] || '';
  if (q.length < 2) return [];

  const useProxy =
    typeof window !== 'undefined' &&
    !import.meta.env?.DEV &&
    Boolean(window.location?.origin);

  const pageSize = Math.min(25, Math.max(limit * 2, 12));
  const url = useProxy
    ? `/api/food-search?q=${encodeURIComponent(q)}&limit=${pageSize}`
    : `${USDA_SEARCH}?${new URLSearchParams({
        api_key: clientUsdaKey(),
        query: q,
        pageSize: String(pageSize),
        dataType: 'Branded,Survey (FNDDS),Foundation,SR Legacy',
      })}`;

  const res = await fetch(url, { signal });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Food search failed (${res.status})`);
  }
  const data = await res.json();
  const foods =
    Array.isArray(data.foods) && data.foods[0]?.name != null && data.foods[0]?.source
      ? data.foods
      : (data.foods || []).map(mapUsdaFood);

  return foods
    .filter((food) => food.calories > 0 || food.protein > 0)
    .map((food) => ({ food, score: rankRemote(food, q) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ food }) => food);
}

export async function searchOpenFoodFacts(query, { signal, limit = DEFAULT_SEARCH_LIMIT } = {}) {
  const { foodQuery } = parseFoodQuery(query);
  const q = searchTerms(foodQuery)[0] || '';
  if (q.length < 2) return [];

  const params = new URLSearchParams({
    search_terms: q,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: String(Math.min(20, limit * 2)),
    fields: 'code,product_name,generic_name,brands,serving_size,nutriments',
  });

  const res = await fetch(`${OFF_SEARCH}?${params}`, {
    signal,
    headers: { 'User-Agent': 'TallyHabits/1.0 (calorie diary)' },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.products || [])
    .map(mapOpenFoodFacts)
    .filter((food) => food.name && (food.calories > 0 || food.protein > 0))
    .map((food) => ({ food, score: rankRemote(food, q) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ food }) => food);
}

/**
 * Local hits immediately; USDA + Open Food Facts fill in after. Dedupes by name.
 */
export async function searchFoods(query, { signal, limit = DEFAULT_SEARCH_LIMIT } = {}) {
  const { quantity, foodQuery } = parseFoodQuery(query);
  const local = searchLocalFoods(query, limit);

  const [usda, off] = await Promise.all([
    searchUsdaFoods(query, { signal, limit }).catch(() => []),
    searchOpenFoodFacts(query, { signal, limit }).catch(() => []),
  ]);

  const remote = [...usda, ...off]
    .map((food) => ({ food, score: rankRemote(food, foodQuery) }))
    .sort((a, b) => b.score - a.score)
    .map(({ food }) => food);

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
    calories: food.baseCalories ?? food.calories,
    protein: food.baseProtein ?? food.protein,
    carbs: food.baseCarbs ?? food.carbs,
    fat: food.baseFat ?? food.fat,
  };
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
