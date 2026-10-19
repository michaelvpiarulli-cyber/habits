/**
 * Life OS food targets. These are display goals for the dashboard.
 * The Protein habit keeps its own target (185 g in the starter set) so a
 * logged day can pass that habit while the dashboard still shows 210 g.
 */

export const FOOD_GOALS = {
  calories: 2100,
  protein: 210,
};

function hasFood(entry) {
  if (!entry || entry.deleted) return false;
  const calories = Number(entry.calories) || 0;
  const protein = Number(entry.protein) || 0;
  const carbs = Number(entry.carbs) || 0;
  const fat = Number(entry.fat) || 0;
  const meals = Array.isArray(entry.meals) ? entry.meals.length : 0;
  return calories > 0 || protein > 0 || carbs > 0 || fat > 0 || meals > 0;
}

/**
 * Prefer the newer of an ingested daily total and the in-app meal log.
 * `source` is `ingest` or `log`.
 */
export function preferFoodEntry(ingested, logged) {
  const fromIngest = hasFood(ingested) ? ingested : null;
  const fromLog = hasFood(logged) ? logged : null;
  if (!fromIngest && !fromLog) return null;
  if (!fromIngest) return { ...fromLog, source: 'log' };
  if (!fromLog) return { ...fromIngest, source: 'ingest' };
  const ingestAt = fromIngest.updatedAt || '';
  const logAt = fromLog.updatedAt || '';
  if (ingestAt >= logAt) return { ...fromIngest, source: 'ingest' };
  return { ...fromLog, source: 'log' };
}

export function foodVsGoals(entry, goals = FOOD_GOALS) {
  const calories = Math.max(0, Number(entry?.calories) || 0);
  const protein = Math.max(0, Number(entry?.protein) || 0);
  return {
    calories,
    protein,
    calorieGoal: goals.calories,
    proteinGoal: goals.protein,
    calorieRatio: goals.calories > 0 ? calories / goals.calories : 0,
    proteinRatio: goals.protein > 0 ? protein / goals.protein : 0,
  };
}
