/** JENO inbox: activity the API recorded, plus food days not yet in that log. */

import { foodCount, presentMeals } from './foodLog.js';

function foodSummary(entry) {
  const meals = presentMeals(entry);
  const foods = meals.flatMap((meal) =>
    meal.foods.length
      ? meal.foods.map((food) => `${meal.name}: ${food.name}`)
      : [`${meal.name}`]
  );
  const count = foodCount(entry);
  return {
    id: `food:${entry.day}`,
    kind: 'nutrition',
    action: 'logged',
    summary: `Food for ${entry.day} · ${Math.round(Number(entry.calories) || 0)} kcal · ${Math.round(Number(entry.protein) || 0)} g protein`,
    detail: { foods, meals: meals.length, count },
    day: entry.day,
    at: entry.updatedAt || entry.createdAt || `${entry.day}T00:00:00.000Z`,
  };
}

export function inboxItems({ activity = [], nutrition = [] } = {}) {
  const fromActivity = (activity || [])
    .filter((row) => row && !row.deleted)
    .map((row) => ({
      id: row.id,
      kind: row.kind,
      action: row.action,
      summary: row.summary,
      detail: row.detail || {},
      day: row.day || null,
      at: row.createdAt || row.created_at || '',
    }));
  const seenFoodDays = new Set(
    fromActivity.filter((item) => item.kind === 'nutrition' && item.day).map((item) => item.day)
  );
  const fromFood = (nutrition || [])
    .filter((entry) => entry && !entry.deleted && !seenFoodDays.has(entry.day))
    .map(foodSummary);
  return [...fromActivity, ...fromFood].sort((a, b) => String(b.at).localeCompare(String(a.at)));
}
