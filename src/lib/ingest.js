/**
 * Pure checks for POST /api/ingest. The Vercel function adds the secret and
 * the service-role write; these helpers stay free of network calls so tests
 * can cover them.
 */

import { timingSafeEqual } from 'node:crypto';
import { groupFoodEntries, mergeMealLists, sumFoods } from './foodLog.js';
import { isIsoDay } from './isoDay.js';
import { workoutFor } from './workouts.js';

const MAX_MACRO = 20000;
const MAX_MEALS = 40;
const MAX_FOODS = 200;
const MAX_MEALS_JSON = 48000;

export function extractIngestKey(headers = {}) {
  const bag = {};
  for (const [key, value] of Object.entries(headers)) {
    bag[String(key).toLowerCase()] = value;
  }
  const authorization = String(bag.authorization || '');
  const bearer = authorization.match(/^Bearer\s+(.+)$/i);
  if (bearer) return bearer[1].trim();
  return String(bag['x-tally-ingest-key'] || '').trim();
}

export function keysMatch(provided, expected) {
  const encode = (value) => new TextEncoder().encode(String(value || ''));
  const left = encode(provided);
  const right = encode(expected);
  if (left.length === 0 || left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function macro(value, name) {
  if (value === undefined || value === null || value === '') return 0;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > MAX_MACRO) {
    return { error: `${name} must be a number from 0 to ${MAX_MACRO}.` };
  }
  return Math.round(number * 10) / 10;
}

function provided(value) {
  return value !== undefined && value !== null && value !== '';
}

function cleanFood(food, fallbackMeal) {
  if (!food || typeof food !== 'object' || Array.isArray(food)) {
    return { error: 'Each food must be an object.' };
  }
  const name = String(food.name || food.label || '').trim();
  if (!name) return { error: 'Each food needs a name.' };
  if (name.length > 160) return { error: 'Food name is too long.' };
  const calories = macro(food.calories, 'Food calories');
  const protein = macro(food.protein, 'Food protein');
  const carbs = macro(food.carbs, 'Food carbs');
  const fat = macro(food.fat, 'Food fat');
  for (const field of [calories, protein, carbs, fat]) {
    if (field?.error) return field;
  }
  const meal = String(food.meal || food.mealName || fallbackMeal || 'Meal').trim().slice(0, 80) || 'Meal';
  return { value: { name: name.slice(0, 160), calories, protein, carbs, fat, meal } };
}

function cleanFoodList(list, fallbackMeal) {
  if (list == null) return [];
  if (!Array.isArray(list)) return { error: 'foods must be a list.' };
  if (list.length > MAX_FOODS) return { error: 'Too many foods.' };
  const foods = [];
  for (const item of list) {
    const food = cleanFood(item, fallbackMeal);
    if (food.error) return food;
    foods.push(food.value);
  }
  return foods;
}

function cleanMeals(meals) {
  if (meals == null) return [];
  if (!Array.isArray(meals)) return { error: 'meals must be a list.' };
  if (meals.length > MAX_MEALS) return { error: 'meals is too long.' };
  const cleaned = [];
  for (const meal of meals) {
    if (!meal || typeof meal !== 'object' || Array.isArray(meal)) {
      return { error: 'Each meal must be an object.' };
    }
    const name = String(meal.name || meal.label || 'Meal').trim().slice(0, 80) || 'Meal';
    const foods = cleanFoodList(meal.foods ?? meal.entries, name);
    if (foods?.error) return foods;
    const sums = sumFoods(foods);
    const calories = provided(meal.calories) || !foods.length ? macro(meal.calories, 'Meal calories') : sums.calories;
    const protein = provided(meal.protein) || !foods.length ? macro(meal.protein, 'Meal protein') : sums.protein;
    const carbs = provided(meal.carbs) || !foods.length ? macro(meal.carbs, 'Meal carbs') : sums.carbs;
    const fat = provided(meal.fat) || !foods.length ? macro(meal.fat, 'Meal fat') : sums.fat;
    for (const field of [calories, protein, carbs, fat]) {
      if (field?.error) return field;
    }
    const row = { name, calories, protein, carbs, fat };
    if (foods.length) {
      row.foods = foods.map((food) => ({
        name: food.name,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
      }));
    }
    cleaned.push(row);
  }
  if (JSON.stringify(cleaned).length > MAX_MEALS_JSON) return { error: 'meals is too large.' };
  return cleaned;
}

function readDay(body) {
  const day = body.date || body.day;
  if (!isIsoDay(day)) return { error: 'date must be YYYY-MM-DD.' };
  return day;
}

export function validateIngest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, status: 400, error: 'Expected a JSON object.' };
  }
  const kind = body.kind;
  if (kind !== 'nutrition' && kind !== 'workout') {
    return { ok: false, status: 400, error: 'kind must be nutrition or workout.' };
  }
  const day = readDay(body);
  if (day?.error) return { ok: false, status: 400, error: day.error };

  if (kind === 'workout') {
    const plan = workoutFor(day);
    if (plan.kind === 'rest') {
      return { ok: false, status: 400, error: 'That day is a rest day.' };
    }
    const done = body.done === false || body.done === 'false' || body.done === 0 ? false : true;
    return {
      ok: true,
      value: { kind, date: day, done, planId: plan.id },
    };
  }

  const explicit = {
    calories: provided(body.calories),
    protein: provided(body.protein),
    carbs: provided(body.carbs),
    fat: provided(body.fat),
  };
  const calories = macro(body.calories, 'calories');
  const protein = macro(body.protein, 'protein');
  const carbs = macro(body.carbs, 'carbs');
  const fat = macro(body.fat, 'fat');
  for (const field of [calories, protein, carbs, fat]) {
    if (field?.error) return { ok: false, status: 400, error: field.error };
  }

  const touchesFoods =
    body.meals != null || body.entries != null || body.foods != null || provided(body.name);
  let meals = [];
  if (body.meals != null) {
    meals = cleanMeals(body.meals);
    if (meals?.error) return { ok: false, status: 400, error: meals.error };
  }
  const flat = [];
  if (body.entries != null || body.foods != null) {
    const foods = cleanFoodList(body.entries ?? body.foods);
    if (foods?.error) return { ok: false, status: 400, error: foods.error };
    flat.push(...foods);
  }
  if (!body.entries && !body.foods && provided(body.name)) {
    const single = cleanFood(body);
    if (single.error) return { ok: false, status: 400, error: single.error };
    flat.push(single.value);
  }
  if (flat.length) meals = mergeMealLists(meals, groupFoodEntries(flat));
  if (JSON.stringify(meals).length > MAX_MEALS_JSON) {
    return { ok: false, status: 400, error: 'meals is too large.' };
  }

  const mode = body.mode === 'append' ? 'append' : 'replace';
  return {
    ok: true,
    value: {
      kind,
      date: day,
      calories,
      protein,
      carbs,
      fat,
      meals,
      explicit,
      mode,
      foodMode: touchesFoods ? mode : 'totals-only',
    },
  };
}
