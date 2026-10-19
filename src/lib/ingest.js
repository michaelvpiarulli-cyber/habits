/**
 * Pure checks for POST /api/ingest. The Vercel function adds the secret and
 * the service-role write; these helpers stay free of network calls so tests
 * can cover them.
 */

import { timingSafeEqual } from 'node:crypto';
import { isIsoDay } from './isoDay.js';
import { workoutFor } from './workouts.js';

const MAX_MACRO = 20000;
const MAX_MEALS = 40;
const MAX_MEALS_JSON = 32000;

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

function cleanMeals(meals) {
  if (meals == null) return [];
  if (!Array.isArray(meals)) return { error: 'meals must be a list.' };
  if (meals.length > MAX_MEALS) return { error: 'meals is too long.' };
  const cleaned = [];
  for (const meal of meals) {
    if (!meal || typeof meal !== 'object' || Array.isArray(meal)) {
      return { error: 'Each meal must be an object.' };
    }
    const calories = macro(meal.calories, 'Meal calories');
    const protein = macro(meal.protein, 'Meal protein');
    const carbs = macro(meal.carbs, 'Meal carbs');
    const fat = macro(meal.fat, 'Meal fat');
    if (calories?.error) return calories;
    if (protein?.error) return protein;
    if (carbs?.error) return carbs;
    if (fat?.error) return fat;
    cleaned.push({
      name: String(meal.name || meal.label || '').slice(0, 120),
      calories,
      protein,
      carbs,
      fat,
    });
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

  const calories = macro(body.calories, 'calories');
  const protein = macro(body.protein, 'protein');
  const carbs = macro(body.carbs, 'carbs');
  const fat = macro(body.fat, 'fat');
  for (const field of [calories, protein, carbs, fat]) {
    if (field?.error) return { ok: false, status: 400, error: field.error };
  }
  const meals = cleanMeals(body.meals);
  if (meals?.error) return { ok: false, status: 400, error: meals.error };

  return {
    ok: true,
    value: { kind, date: day, calories, protein, carbs, fat, meals },
  };
}
