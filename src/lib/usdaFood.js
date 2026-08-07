/**
 * Shared USDA FoodData Central parsing (safe for browser and Vercel functions).
 */

const NUTRIENT = {
  calories: ['Energy'],
  protein: ['Protein'],
  carbs: ['Carbohydrate, by difference', 'Carbohydrate by difference'],
  fat: ['Total lipid (fat)', 'Total lipid fat'],
};

function nutrientValue(foodNutrients, names) {
  for (const name of names) {
    const hit = (foodNutrients || []).find(
      (n) =>
        (n.nutrientName || n.nutrient?.name || '') === name &&
        String(n.unitName || n.nutrient?.unitName || '').toUpperCase() !== 'KJ'
    );
    if (hit && Number.isFinite(Number(hit.value ?? hit.amount))) {
      return Number(hit.value ?? hit.amount);
    }
  }
  return 0;
}

export function mapUsdaFood(raw) {
  const nutrients = raw.foodNutrients || [];
  const calories = nutrientValue(nutrients, NUTRIENT.calories);
  const protein = nutrientValue(nutrients, NUTRIENT.protein);
  const carbs = nutrientValue(nutrients, NUTRIENT.carbs);
  const fat = nutrientValue(nutrients, NUTRIENT.fat);

  const isAnalytical = /foundation|sr legacy|survey/i.test(raw.dataType || '');
  let serving = '1 serving';

  if (raw.householdServingFullText) {
    serving = raw.householdServingFullText;
  } else if (raw.servingSize && raw.servingSizeUnit) {
    serving = `${Math.round(Number(raw.servingSize))}${raw.servingSizeUnit}`;
  } else if (isAnalytical) {
    serving = '100 g';
  }

  const round1 = (n) => Math.round(n * 10) / 10;
  return {
    id: `usda-${raw.fdcId}`,
    fdcId: raw.fdcId,
    name: raw.description || 'Food',
    brand: raw.brandOwner || raw.brandName || raw.dataType || 'USDA',
    serving,
    calories: Math.round(calories),
    protein: round1(protein),
    carbs: round1(carbs),
    fat: round1(fat),
    source: 'usda',
  };
}
