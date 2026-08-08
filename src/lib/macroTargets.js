/**
 * Daily calorie / macro targets for the Calories tab.
 * MacroFactor-style: compare intake to targets, show consumed or remaining.
 * Adherence-neutral — going over is just data, never a “bad” state.
 */

export const TARGET_FIELDS = [
  { id: 'calories', label: 'Calories', unit: 'kcal', step: 50, min: 800, max: 6000 },
  { id: 'protein', label: 'Protein', unit: 'g', step: 5, min: 20, max: 400 },
  { id: 'carbs', label: 'Carbs', unit: 'g', step: 5, min: 0, max: 800 },
  { id: 'fat', label: 'Fat', unit: 'g', step: 5, min: 0, max: 300 },
];

export const DEFAULT_TARGETS = {
  calories: 2200,
  protein: 185,
  carbs: 200,
  fat: 70,
};

export const MACRO_VIEW_KEY = 'tally-macro-view';
export const MACRO_TARGETS_KEY = 'tally-macro-targets';

export function clampTarget(id, value) {
  const field = TARGET_FIELDS.find((item) => item.id === id);
  const n = Math.round(Number(value) || 0);
  if (!field) return Math.max(0, n);
  return Math.min(field.max, Math.max(field.min, n));
}

export function normalizeTargets(raw = {}) {
  return {
    calories: clampTarget('calories', raw.calories ?? DEFAULT_TARGETS.calories),
    protein: clampTarget('protein', raw.protein ?? DEFAULT_TARGETS.protein),
    carbs: clampTarget('carbs', raw.carbs ?? DEFAULT_TARGETS.carbs),
    fat: clampTarget('fat', raw.fat ?? DEFAULT_TARGETS.fat),
  };
}

export function loadMacroTargets() {
  try {
    const raw = JSON.parse(localStorage.getItem(MACRO_TARGETS_KEY) || 'null');
    return normalizeTargets(raw || {});
  } catch {
    return { ...DEFAULT_TARGETS };
  }
}

export function saveMacroTargets(targets) {
  const next = normalizeTargets(targets);
  localStorage.setItem(MACRO_TARGETS_KEY, JSON.stringify(next));
  return next;
}

export function loadMacroView() {
  const view = localStorage.getItem(MACRO_VIEW_KEY);
  return view === 'consumed' ? 'consumed' : 'remaining';
}

export function saveMacroView(view) {
  const next = view === 'consumed' ? 'consumed' : 'remaining';
  localStorage.setItem(MACRO_VIEW_KEY, next);
  return next;
}

/** Seed protein target from the Protein habit when the user hasn’t set one. */
export function targetsWithHabitSeed(targets, proteinHabitTarget) {
  const next = normalizeTargets(targets);
  if (!localStorage.getItem(MACRO_TARGETS_KEY) && proteinHabitTarget > 0) {
    next.protein = clampTarget('protein', proteinHabitTarget);
  }
  return next;
}

export function intakeOf(entry = {}) {
  return {
    calories: Math.max(0, Math.round(Number(entry.calories) || 0)),
    protein: Math.max(0, Math.round((Number(entry.protein) || 0) * 10) / 10),
    carbs: Math.max(0, Math.round((Number(entry.carbs) || 0) * 10) / 10),
    fat: Math.max(0, Math.round((Number(entry.fat) || 0) * 10) / 10),
  };
}

export function remainingOf(intake, targets) {
  const t = normalizeTargets(targets);
  const i = intakeOf(intake);
  return {
    calories: t.calories - i.calories,
    protein: Math.round((t.protein - i.protein) * 10) / 10,
    carbs: Math.round((t.carbs - i.carbs) * 10) / 10,
    fat: Math.round((t.fat - i.fat) * 10) / 10,
  };
}

/** 0–1+ progress toward target. Values above 1 mean over target (still fine). */
export function progressOf(consumed, target) {
  const t = Number(target) || 0;
  if (t <= 0) return 0;
  return Math.max(0, (Number(consumed) || 0) / t);
}

export function formatMacro(value, { signed = false } = {}) {
  const n = Number(value) || 0;
  const rounded = Math.abs(n) >= 100 ? Math.round(n) : Math.round(n * 10) / 10;
  if (signed && rounded > 0) return `+${rounded}`;
  return String(rounded);
}
