/**
 * Map Open Food Facts / search-a-licious hits into Tally food rows.
 * Shared by the browser client and the Vercel off-search proxy.
 */

function round1(n) {
  return Math.round(Number(n) * 10) / 10;
}

function brandOf(product) {
  const raw = product.brands;
  if (Array.isArray(raw)) return (raw[0] || '').trim() || 'Open Food Facts';
  if (typeof raw === 'string') return raw.split(',')[0].trim() || 'Open Food Facts';
  return 'Open Food Facts';
}

/** Legacy cgi/search.pl product shape + search-a-licious hit shape. */
export function mapOpenFoodFactsHit(product) {
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

  const kcalFrom = (kcalKey, kjKey, energyKey) => {
    if (n[kcalKey] != null) return Number(n[kcalKey]) || 0;
    if (n[kjKey] != null) return Number(n[kjKey]) / 4.184 || 0;
    if (n[energyKey] != null) return Number(n[energyKey]) / 4.184 || 0;
    return 0;
  };

  if (hasServing) {
    calories = kcalFrom('energy-kcal_serving', 'energy-kj_serving', 'energy_serving');
    protein = Number(n.proteins_serving) || 0;
    carbs = Number(n.carbohydrates_serving) || 0;
    fat = Number(n.fat_serving) || 0;
  } else {
    calories = kcalFrom('energy-kcal_100g', 'energy-kj_100g', 'energy_100g');
    protein = Number(n.proteins_100g) || 0;
    carbs = Number(n.carbohydrates_100g) || 0;
    fat = Number(n.fat_100g) || 0;
    serving = product.serving_size || '100 g';
  }

  const name =
    product.product_name ||
    product.product_name_en ||
    product.generic_name ||
    'Food';
  const brand = brandOf(product);
  const code = product.code || product._id || name;

  return {
    id: `off-${code}`,
    name: String(name).trim(),
    brand,
    serving,
    calories: Math.round(calories),
    protein: round1(protein),
    carbs: round1(carbs),
    fat: round1(fat),
    source: 'off',
  };
}

/** @deprecated alias — older call sites */
export const mapOpenFoodFacts = mapOpenFoodFactsHit;
