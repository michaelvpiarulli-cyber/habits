/** Line-icon keys and muted tints for habits. Emoji stays stored and is never read here. */

export const HABIT_ICONS = [
  ['scale', 'Scale'],
  ['droplet', 'Droplet'],
  ['footprints', 'Footprints'],
  ['book', 'Book'],
  ['moon', 'Moon'],
  ['dumbbell', 'Dumbbell'],
  ['apple', 'Apple'],
  ['leaf', 'Leaf'],
  ['heart', 'Heart'],
  ['sun', 'Sun'],
  ['pencil', 'Pencil'],
  ['check', 'Check'],
];

export const HABIT_COLORS = ['gray', 'brown', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'red'];

const ICON_KEYS = new Set(HABIT_ICONS.map(([key]) => key));
const COLOR_KEYS = new Set(HABIT_COLORS);

const ICON_COLOR = {
  scale: 'blue',
  droplet: 'blue',
  footprints: 'green',
  book: 'purple',
  moon: 'purple',
  dumbbell: 'orange',
  apple: 'red',
  leaf: 'green',
  heart: 'pink',
  sun: 'yellow',
  pencil: 'brown',
  check: 'gray',
};

export function iconForHabit(habit) {
  if (ICON_KEYS.has(habit?.icon)) return habit.icon;
  const name = String(habit?.name || '').toLowerCase();
  if (/\b(weigh|weight|scale)\b/.test(name)) return 'scale';
  if (/\b(water|drink|hydrat\w*)\b/.test(name)) return 'droplet';
  if (/\b(walk|steps?|run|jog)\b/.test(name)) return 'footprints';
  if (/\b(bible|read|reading|scripture|book)\b/.test(name)) return 'book';
  if (/\bsleep\b/.test(name)) return 'moon';
  if (/\b(workout|lift|gym|exercise|move|training)\b/.test(name)) return 'dumbbell';
  if (/\b(whole|veg|vegetable|plant)\b/.test(name)) return 'leaf';
  if (/\b(protein|eat|eaten|food|meal|calorie)\b/.test(name)) return 'apple';
  return 'check';
}

export function colorForHabit(habit) {
  if (COLOR_KEYS.has(habit?.color)) return habit.color;
  return ICON_COLOR[iconForHabit(habit)] || 'gray';
}
