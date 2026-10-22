/**
 * One Monday-Sunday review. Pure so the Week page and the tests share it.
 */

import { addDays, formatLong, startOfWeek, todayISO } from './dates.js';
import { FOOD_GOALS, ingestedFoodForDay, preferFoodEntry } from './foodGoals.js';
import { living } from './life.js';
import { workoutsOnDay } from './program.js';
import { stepsOnDay } from './steps.js';
import { isIsoDay } from './isoDay.js';

export function weekStartFor(day, today = todayISO()) {
  const current = startOfWeek(today);
  const picked = startOfWeek(isIsoDay(day) ? day : today);
  return picked > current ? current : picked;
}

export function readWeekStart(search = '', today = todayISO()) {
  const params = new URLSearchParams(String(search).replace(/^\?/, ''));
  return weekStartFor(params.get('week') || '', today);
}

export function searchForWeek(search, start, today = todayISO()) {
  const params = new URLSearchParams(String(search || '').replace(/^\?/, ''));
  const monday = weekStartFor(start, today);
  if (monday === startOfWeek(today)) params.delete('week');
  else params.set('week', monday);
  const text = params.toString();
  return text ? `?${text}` : '';
}

export function weekDays(start) {
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function weekLabel(start) {
  return `${formatLong(start)} to ${formatLong(addDays(start, 6))}`;
}

export function habitWeekCount(days, doneSet) {
  const marks = days.map((day) => Boolean(doneSet?.has(day)));
  return { marks, count: marks.filter(Boolean).length, total: days.length };
}

function dayStamp(value) {
  if (!value) return '';
  const text = String(value);
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : '';
}

export function tasksCompletedInWeek(tasks, days) {
  const set = new Set(days);
  return living(tasks).filter((task) => {
    if (!task.done) return false;
    const completed = dayStamp(task.completedAt);
    if (completed) return set.has(completed);
    return Boolean(task.dueDate && set.has(task.dueDate));
  });
}

export function foodForDay(dailyNutrition, mealLogs, day) {
  const logged = (mealLogs || []).find((row) => row && row.day === day && !row.deleted) || null;
  return preferFoodEntry(ingestedFoodForDay(dailyNutrition, day), logged);
}

export function weekFood(dailyNutrition, mealLogs, days) {
  const rows = days.map((day) => {
    const entry = foodForDay(dailyNutrition, mealLogs, day);
    if (!entry) return { day, calories: null, protein: null };
    return {
      day,
      calories: Math.round(Number(entry.calories) || 0),
      protein: Math.round(Number(entry.protein) || 0),
    };
  });
  const logged = rows.filter((row) => row.calories != null);
  const average = logged.length
    ? Math.round(logged.reduce((sum, row) => sum + row.calories, 0) / logged.length)
    : null;
  const withProtein = logged.filter((row) => row.protein > 0);
  const proteinAverage = withProtein.length
    ? Math.round(withProtein.reduce((sum, row) => sum + row.protein, 0) / withProtein.length)
    : null;
  return { rows, average, loggedDays: logged.length, proteinAverage, goal: FOOD_GOALS.calories };
}

export function weekSteps(rows, days) {
  const list = days.map((day) => ({ day, steps: stepsOnDay(rows, day) }));
  if (!list.some((row) => row.steps != null)) return null;
  return list;
}

export function weekWorkouts(programWorkouts, workoutLogs, days) {
  const items = [];
  for (const day of days) {
    const scheduled = workoutsOnDay(programWorkouts, day);
    for (const workout of scheduled) {
      const log = (workoutLogs || []).find((row) => row && row.day === day && !row.deleted);
      items.push({
        day,
        name: workout.name,
        done: Boolean(log?.done),
      });
    }
  }
  const done = items.filter((item) => item.done).length;
  return { items, scheduled: items.length, done };
}
