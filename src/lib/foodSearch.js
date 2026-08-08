/**
 * Food search for the calorie diary.
 *
 * Instant: built-in catalog (~1.2k) + personal library (grows as you search).
 * Million-scale: USDA FoodData Central (~400k) + Open Food Facts (3.5M+).
 */

import { COMMON_FOODS } from './commonFoods.js';
import { FOOD_UNIVERSE, loadFoodLibrary, rememberLibraryFoods } from './foodLibrary.js';
import { mapOpenFoodFactsHit } from './openFoodFacts.js';
import { mapUsdaFood } from './usdaFood.js';
import { clampQuantity, scaleFoodMacros } from './nutrition.js';

const USDA_SEARCH = 'https://api.nal.usda.gov/fdc/v1/foods/search';
const OFF_SEARCH_DIRECT = 'https://search.openfoodfacts.org/search';

export const DEFAULT_SEARCH_LIMIT = 16;
export { FOOD_UNIVERSE };

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

function dedupeKey(food) {
  return [
    (food.name || '').toLowerCase(),
    (food.brand || '').toLowerCase(),
    Math.round(Number(food.calories) || 0),
  ].join('|');
}

function catalogForSearch() {
  const library = typeof localStorage !== 'undefined' ? loadFoodLibrary() : [];
  if (library.length === 0) return COMMON_FOODS;
  const seen = new Set(COMMON_FOODS.map((food) => food.id));
  const extras = library.filter((food) => food.id && !seen.has(food.id));
  return extras.length ? [...COMMON_FOODS, ...extras] : COMMON_FOODS;
}

export function searchLocalFoods(query, limit = DEFAULT_SEARCH_LIMIT) {
  const { foodQuery } = parseFoodQuery(query);
  const terms = searchTerms(foodQuery);
  if (terms.length === 0) return [];

  const catalog = catalogForSearch();
  const best = new Map();
  for (const term of terms) {
    for (const food of catalog) {
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
      source: food.source || 'local',
    }));
}

function clientUsdaKey() {
  return import.meta.env?.VITE_USDA_API_KEY || 'DEMO_KEY';
}

function inBrowser() {
  return typeof window !== 'undefined' && Boolean(window.location?.origin);
}

/** Call USDA (or the deployed /api/food-search proxy). Branded first for labels like Oikos. */
export async function searchUsdaFoods(query, { signal, limit = DEFAULT_SEARCH_LIMIT } = {}) {
  const { foodQuery } = parseFoodQuery(query);
  const q = searchTerms(foodQuery)[0] || '';
  if (q.length < 2) return [];

  const useProxy = inBrowser() && !import.meta.env?.DEV;
  const pageSize = Math.min(50, Math.max(limit * 3, 20));
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

/**
 * Open Food Facts search-a-licious — 3.5M+ packaged foods.
 * Uses /api/off-search in the browser (Vite proxy or Vercel function).
 */
export async function searchOpenFoodFacts(query, { signal, limit = DEFAULT_SEARCH_LIMIT } = {}) {
  const { foodQuery } = parseFoodQuery(query);
  const q = searchTerms(foodQuery)[0] || '';
  if (q.length < 2) return [];

  const pageSize = Math.min(40, Math.max(limit * 2, 20));
  const url = inBrowser()
    ? `/api/off-search?q=${encodeURIComponent(q)}&limit=${pageSize}`
    : `${OFF_SEARCH_DIRECT}?${new URLSearchParams({
        q,
        page_size: String(pageSize),
        langs: 'en',
      })}`;

  const res = await fetch(url, {
    signal,
    headers: inBrowser() ? undefined : { 'User-Agent': 'TallyHabits/1.0 (calorie diary)' },
  });
  if (!res.ok) return [];
  const data = await res.json();
  const raw = data.foods || data.hits || data.products || [];
  const mapped = (data.foods && data.foods[0]?.source === 'off'
    ? data.foods
    : raw.map(mapOpenFoodFactsHit)
  ).filter((food) => food.name && (food.calories > 0 || food.protein > 0));

  return mapped
    .map((food) => ({ food, score: rankRemote(food, q) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ food }) => food);
}

/** @deprecated — kept for older imports */
export const mapOpenFoodFacts = mapOpenFoodFactsHit;

/**
 * Local hits immediately; USDA + Open Food Facts fill in after.
 * Remote hits are cached into the personal library for next time.
 */
export async function searchFoods(query, { signal, limit = DEFAULT_SEARCH_LIMIT } = {}) {
  const { quantity, foodQuery } = parseFoodQuery(query);
  const local = searchLocalFoods(query, limit);

  const [usda, off] = await Promise.all([
    searchUsdaFoods(query, { signal, limit: Math.max(limit, 20) }).catch(() => []),
    searchOpenFoodFacts(query, { signal, limit: Math.max(limit, 20) }).catch(() => []),
  ]);

  const remote = [...usda, ...off]
    .map((food) => ({ food, score: rankRemote(food, foodQuery) }))
    .sort((a, b) => b.score - a.score)
    .map(({ food }) => food);

  if (remote.length && typeof localStorage !== 'undefined') {
    rememberLibraryFoods(remote.slice(0, 40));
  }

  const seen = new Set(local.map(dedupeKey));
  const merged = [...local];
  for (const food of remote) {
    const key = dedupeKey(food);
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
