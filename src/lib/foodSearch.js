/**
 * Food search for the calorie diary.
 *
 * Instant: built-in catalog (~1.2k) + personal library (grows as you search).
 * Million-scale: USDA FoodData Central (~400k) + Open Food Facts (3.5M+).
 *
 * Ranking prefers the food you meant (name/token match) over brand noise.
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

/** Shorthand people type → expand in place (never as a bare brand-only term). */
const QUERY_SYNONYMS = {
  pb: 'peanut butter',
  pbf: 'peanut butter',
  cottage: 'cottage cheese',
  whey: 'whey protein',
  'protein powder': 'whey protein',
  oatmeal: 'oatmeal',
  oats: 'oats',
  mcd: "mcdonald's",
  mcdonalds: "mcdonald's",
  mcdonald: "mcdonald's",
  chickfila: 'chick-fil-a',
  'chick fil a': 'chick-fil-a',
  cfa: 'chick-fil-a',
  sbux: 'starbucks',
  tbell: 'taco bell',
  tacobell: 'taco bell',
  innout: 'in-n-out',
  'in n out': 'in-n-out',
  'jimmy johns': "jimmy john's",
  bww: 'buffalo wild wings',
  'jersey mikes': "jersey mike's",
  'papa johns': "papa john's",
  wahoos: "wahoo's",
  wahoo: "wahoo's",
  lunagrill: 'luna grill',
  oj: 'orange juice',
  fries: 'french fries',
  'greek yogurt': 'greek yogurt',
  gy: 'greek yogurt',
  'avocado toast': 'avocado toast',
};

const STAPLE_BOOST = new Set([
  'egg',
  'eggs',
  'chicken',
  'chicken breast',
  'rice',
  'oats',
  'oatmeal',
  'banana',
  'apple',
  'yogurt',
  'greek yogurt',
  'cottage cheese',
  'peanut butter',
  'protein',
  'whey',
  'turkey',
  'salmon',
  'avocado',
  'bread',
  'pasta',
  'potato',
  'sweet potato',
]);

function tokenize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9+]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function expandQuery(foodQuery) {
  const raw = foodQuery.trim().toLowerCase();
  if (!raw) return [];

  const expanded = new Set([raw]);
  if (QUERY_SYNONYMS[raw]) expanded.add(QUERY_SYNONYMS[raw]);

  // Replace known shorthand tokens in place — do NOT add bare brand alone
  // (that used to make "mcd fries" match every McDonald's item).
  const tokens = raw.split(/\s+/).filter(Boolean);
  const replaced = tokens.map((token) => QUERY_SYNONYMS[token] || token).join(' ');
  if (replaced !== raw) expanded.add(replaced);

  for (const [key, value] of Object.entries(QUERY_SYNONYMS)) {
    if (!key.includes(' ')) continue;
    if (raw.includes(key)) expanded.add(raw.split(key).join(value));
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

/** Most specific expanded query for remote APIs. */
function primaryRemoteQuery(foodQuery) {
  const terms = searchTerms(foodQuery);
  if (terms.length === 0) return '';
  return [...terms].sort((a, b) => b.length - a.length || a.localeCompare(b))[0];
}

function tokenPrefixMatch(token, candidate) {
  if (!token || !candidate) return false;
  if (candidate === token || candidate.startsWith(token)) return true;
  // "chick" → "chicken", "yog" → "yogurt"
  if (token.length >= 3 && candidate.startsWith(token)) return true;
  return false;
}

function tokensCoverQuery(queryTokens, hayTokens) {
  return queryTokens.every((qt) =>
    hayTokens.some((ht) => tokenPrefixMatch(qt, ht) || ht.includes(qt))
  );
}

/**
 * Score a food against a query. Higher = better.
 * Name/token hits beat brand-only hits so "chicken" surfaces breast, not noise.
 */
export function scoreFood(food, query) {
  const q = String(query || '')
    .toLowerCase()
    .trim();
  if (!q) return 0;

  const name = (food.name || '').toLowerCase();
  const brand = (food.brand || '').toLowerCase();
  const aliases = (food.aliases || []).map((a) => String(a).toLowerCase());
  const qTokens = tokenize(q);
  const nameTokens = tokenize(name);
  const brandTokens = tokenize(brand);
  const aliasTokens = aliases.flatMap(tokenize);
  const nameHay = [...nameTokens, ...aliasTokens];

  let score = 0;

  if (name === q || aliases.includes(q)) {
    score = 220;
  } else if (nameTokens.join(' ') === qTokens.join(' ')) {
    score = 210;
  } else if (qTokens.length && tokensCoverQuery(qTokens, nameTokens)) {
    // All query words appear in the name — what people usually mean.
    score = 180;
    if (nameTokens[0] && tokenPrefixMatch(qTokens[0], nameTokens[0])) score += 15;
  } else if (name.startsWith(q)) {
    score = 160;
  } else if (nameTokens.some((t) => tokenPrefixMatch(q, t))) {
    score = 150;
  } else if (aliases.some((a) => a === q || a.includes(q) || tokenize(a).some((t) => tokenPrefixMatch(q, t)))) {
    score = 140;
  } else if (name.includes(q)) {
    score = 120;
  } else if (qTokens.length > 1 && tokensCoverQuery(qTokens, [...nameHay, ...brandTokens])) {
    // Brand + food word (e.g. mcdonald's + fries)
    score = 110;
    if (!tokensCoverQuery(qTokens.filter((t) => t.length > 2), nameHay)) {
      // Some tokens only on brand — still ok for "mcd fries"
      score = 100;
    }
  } else if (brand === q || brandTokens.some((t) => tokenPrefixMatch(q, t))) {
    // Brand-only: useful for browsing a chain, but weak for food words.
    score = 45;
  } else if (q.length >= 4 && nameTokens.some((t) => editDistance(q, t) === 1)) {
    score = 70; // light typo tolerance on a name word
  } else {
    return 0;
  }

  // Everyday staples: prefer Generic chicken breast over Chipotle "Chicken".
  if (brand === 'generic' && (STAPLE_BOOST.has(q) || qTokens.some((t) => STAPLE_BOOST.has(t)))) {
    score += 35;
  }

  // Shorter, simpler names usually match intent better.
  score += Math.max(0, 24 - name.length / 5);

  // Exact single-word name like "Banana" for query "banana"
  if (qTokens.length === 1 && nameTokens.length === 1 && tokenPrefixMatch(qTokens[0], nameTokens[0])) {
    score += 20;
  }

  // Penalize very long restaurant builds when query is a simple staple word.
  if (qTokens.length === 1 && nameTokens.length >= 5 && brand !== 'generic') {
    score -= 25;
  }

  return score;
}

function editDistance(a, b) {
  if (Math.abs(a.length - b.length) > 1) return 99;
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  const prev = new Array(n + 1);
  const cur = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= n; j++) prev[j] = cur[j];
  }
  return prev[n];
}

function rankRemote(food, query) {
  return scoreFood(food, query);
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
      const score = scoreFood(food, term);
      if (score <= 0) continue;
      const prev = best.get(food.id);
      if (!prev || score > prev.score) best.set(food.id, { food, score });
    }
  }

  return [...best.values()]
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.food.name.length - b.food.name.length ||
        a.food.name.localeCompare(b.food.name)
    )
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
  const q = primaryRemoteQuery(foodQuery);
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
    .filter((row) => row.score > 0)
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
  const q = primaryRemoteQuery(foodQuery);
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
    .filter((row) => row.score > 0)
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
  const remoteQuery = primaryRemoteQuery(foodQuery);

  const [usda, off] = await Promise.all([
    searchUsdaFoods(query, { signal, limit: Math.max(limit, 20) }).catch(() => []),
    searchOpenFoodFacts(query, { signal, limit: Math.max(limit, 20) }).catch(() => []),
  ]);

  const remote = [...usda, ...off]
    .map((food) => ({ food, score: rankRemote(food, remoteQuery || foodQuery) }))
    .filter((row) => row.score > 0)
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
