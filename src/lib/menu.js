import { STARTER_HABITS } from './habits.js';

/**
 * Today is a menu. Habits sit on a course the way dishes sit on a ticket —
 * starters first, mains to close the day, desserts you named as the treat.
 *
 * A stored `course` wins. Everything else is inferred so a fresh install
 * already looks like a menu instead of a flat checklist.
 */

export const COURSES = [
  { id: 'starter', name: 'Starters' },
  { id: 'main', name: 'Mains' },
  { id: 'side', name: 'Sides' },
  { id: 'dessert', name: 'Desserts' },
  { id: 'special', name: 'Specials' },
];

export const COURSE_IDS = COURSES.map((course) => course.id);

const STARTER_COURSE_BY_ID = {
  [STARTER_HABITS[0].id]: 'main',
  [STARTER_HABITS[1].id]: 'side',
  [STARTER_HABITS[2].id]: 'main',
  [STARTER_HABITS[3].id]: 'main',
  [STARTER_HABITS[4].id]: 'starter',
};

export function isCourse(value) {
  return COURSE_IDS.includes(value);
}

export function courseLabel(id) {
  return COURSES.find((course) => course.id === id)?.name || 'Mains';
}

/** Guess a course from kind, cadence, and a few obvious names. */
export function inferCourse(habit) {
  if (!habit) return 'main';
  if (STARTER_COURSE_BY_ID[habit.id]) return STARTER_COURSE_BY_ID[habit.id];

  const name = String(habit.name || '').toLocaleLowerCase('en-US');
  if (/(dessert|chocolate|youtube|movie|treat)/.test(name)) return 'dessert';
  if (/(vacation|wishlist|special)/.test(name)) return 'special';
  if (habit.cadence === 'per_week') return 'special';
  if (habit.kind === 'measure') return 'starter';
  if (habit.kind === 'count') return 'side';
  if (habit.kind === 'check') return 'starter';
  return 'main';
}

/** Stored course if valid, otherwise the inferred one. */
export function courseOf(habit) {
  return isCourse(habit?.course) ? habit.course : inferCourse(habit);
}

/**
 * Split a list into non-empty courses, in menu order.
 * Empty courses stay off the ticket.
 */
export function groupByCourse(habits) {
  return COURSES.map((course) => ({
    ...course,
    habits: habits.filter((habit) => courseOf(habit) === course.id),
  })).filter((group) => group.habits.length > 0);
}

/**
 * Remote rows do not carry `course` yet. After a merge, copy a local course
 * onto a winning remote record so a pull does not flatten the menu.
 */
export function keepLocalCourses(merged, local) {
  if (!Array.isArray(merged) || !Array.isArray(local)) return merged || [];
  const localById = new Map(local.map((habit) => [habit.id, habit]));
  return merged.map((habit) => {
    if (isCourse(habit?.course)) return habit;
    const fromLocal = localById.get(habit?.id)?.course;
    return isCourse(fromLocal) ? { ...habit, course: fromLocal } : habit;
  });
}
