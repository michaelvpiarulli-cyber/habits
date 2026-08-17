/**
 * Lightweight fat-loss coaching for the Calories tab.
 * Estimates maintenance from weigh-ins + logged intake when possible,
 * otherwise from bodyweight × activity factor. Adherence-neutral copy.
 */

import { addDays, daysBetween, todayISO } from './dates.js';
import { intakeOf, normalizeTargets } from './macroTargets.js';

export const COACH_KEY = 'tally-weight-coach';

export const DEFAULT_COACH = {
  mode: 'lose',
  /** Daily calorie deficit vs estimated expenditure. */
  deficit: 400,
  /** Manual expenditure override; null = auto. */
  expenditure: null,
};

export function loadCoach() {
  try {
    const raw = JSON.parse(localStorage.getItem(COACH_KEY) || 'null');
    if (!raw || typeof raw !== 'object') return { ...DEFAULT_COACH };
    return {
      mode: raw.mode === 'maintain' ? 'maintain' : 'lose',
      deficit: Math.min(1000, Math.max(150, Math.round(Number(raw.deficit) || DEFAULT_COACH.deficit))),
      expenditure:
        raw.expenditure == null || raw.expenditure === ''
          ? null
          : Math.min(6000, Math.max(1200, Math.round(Number(raw.expenditure)))),
    };
  } catch {
    return { ...DEFAULT_COACH };
  }
}

export function saveCoach(plan) {
  const next = {
    mode: plan.mode === 'maintain' ? 'maintain' : 'lose',
    deficit: Math.min(1000, Math.max(150, Math.round(Number(plan.deficit) || DEFAULT_COACH.deficit))),
    expenditure:
      plan.expenditure == null || plan.expenditure === ''
        ? null
        : Math.min(6000, Math.max(1200, Math.round(Number(plan.expenditure)))),
  };
  localStorage.setItem(COACH_KEY, JSON.stringify(next));
  return next;
}

/** Find the weigh-in measure habit (starter name or unit looks like weight). */
export function findWeighHabit(habits = []) {
  return (
    habits.find((h) => h.kind === 'measure' && /weigh/i.test(h.name)) ||
    habits.find((h) => h.kind === 'measure' && /lb|kg|weight/i.test(h.unit || '')) ||
    null
  );
}

export function weighReadings(habit, logFor, through = todayISO(), days = 42) {
  if (!habit) return [];
  const start = addDays(through, -(days - 1));
  const rows = [];
  for (let d = start; d <= through; d = addDays(d, 1)) {
    const log = logFor(habit.id, d);
    const value = Number(log?.amount ?? log?.value);
    if (Number.isFinite(value) && value > 0) rows.push({ day: d, weight: value });
  }
  return rows;
}

/** Pounds per week from the latest reading vs ~7 days earlier. Negative is loss. */
export function weeklyWeightRate(readings) {
  if (!Array.isArray(readings) || readings.length < 2) return null;
  const last = readings[readings.length - 1];
  const cutoff = addDays(last.day, -7);
  let prior = readings[0];
  for (const row of readings) {
    if (row.day <= cutoff) prior = row;
  }
  const span = daysBetween(prior.day, last.day);
  if (span < 3) return null;
  return Math.round(((last.weight - prior.weight) / span) * 7 * 10) / 10;
}

/** Rough maintenance from bodyweight (lb). ~14 kcal/lb for moderately active. */
export function maintenanceFromWeight(weightLb) {
  const w = Number(weightLb);
  if (!Number.isFinite(w) || w < 80 || w > 500) return null;
  return Math.round(w * 14);
}

/**
 * Estimate expenditure from weight trend + average intake (MacroFactor-ish).
 * Needs ≥2 weigh-ins spanning ≥5 days and some food logs in that window.
 */
export function estimateExpenditure({ readings, nutritionFor }) {
  if (!readings || readings.length < 2) return null;
  const first = readings[0];
  const last = readings[readings.length - 1];
  const span = daysBetween(first.day, last.day);
  if (span < 5) return null;

  let intakeSum = 0;
  let intakeDays = 0;
  for (let d = first.day; d <= last.day; d = addDays(d, 1)) {
    const entry = nutritionFor?.(d);
    const kcal = intakeOf(entry).calories;
    if (kcal > 0) {
      intakeSum += kcal;
      intakeDays += 1;
    }
  }
  if (intakeDays < 3) return null;

  const avgIntake = intakeSum / intakeDays;
  const lbPerDay = (last.weight - first.weight) / span;
  // 3500 kcal ≈ 1 lb body fat (rough, but directionally useful).
  const surplus = lbPerDay * 3500;
  const expenditure = Math.round(avgIntake - surplus);
  if (expenditure < 1400 || expenditure > 5500) return null;
  return {
    expenditure,
    avgIntake: Math.round(avgIntake),
    lbPerWeek: Math.round(lbPerDay * 7 * 10) / 10,
    sampleDays: intakeDays,
    spanDays: span,
    latestWeight: last.weight,
  };
}

export function resolveExpenditure(coach, { readings, nutritionFor }) {
  if (coach.expenditure) {
    return {
      expenditure: coach.expenditure,
      source: 'manual',
      latestWeight: readings?.[readings.length - 1]?.weight ?? null,
    };
  }
  const fromTrend = estimateExpenditure({ readings, nutritionFor });
  if (fromTrend) return { ...fromTrend, source: 'trend' };
  const latest = readings?.[readings.length - 1]?.weight;
  const fromWeight = maintenanceFromWeight(latest);
  if (fromWeight) {
    return { expenditure: fromWeight, source: 'weight', latestWeight: latest };
  }
  return { expenditure: 2500, source: 'default', latestWeight: null };
}

/** Suggested daily targets for fat loss (high protein, moderate deficit). */
export function suggestTargets(coach, expenditureInfo, proteinHabitTarget) {
  const expenditure = expenditureInfo.expenditure || 2500;
  const deficit = coach.mode === 'maintain' ? 0 : coach.deficit;
  const calories = Math.max(1400, expenditure - deficit);
  const weight = expenditureInfo.latestWeight;
  const proteinFloor = proteinHabitTarget > 0 ? proteinHabitTarget : 185;
  const proteinFromWeight = weight ? Math.round(weight * 0.8) : proteinFloor;
  const protein = Math.max(proteinFloor, Math.min(250, proteinFromWeight));
  const fat = Math.max(45, Math.round((calories * 0.28) / 9));
  const carbs = Math.max(80, Math.round((calories - protein * 4 - fat * 9) / 4));
  return normalizeTargets({ calories, protein, carbs, fat });
}

export function expectedWeeklyLossLb(deficit) {
  return Math.round(((Number(deficit) || 0) / 3500) * 7 * 10) / 10;
}

/**
 * Build the coach card: day totals, deficit status, and one clear next action.
 */
export function buildCoachAdvice({
  entry,
  targets,
  coach,
  expenditureInfo,
  suggested,
  viewingToday = true,
}) {
  const intake = intakeOf(entry);
  const targetKcal = targets.calories;
  const remaining = targetKcal - intake.calories;
  const proteinLeft = Math.round((targets.protein - intake.protein) * 10) / 10;
  const weekRate = expectedWeeklyLossLb(coach.deficit);
  const expenditure = expenditureInfo.expenditure;

  const totals = {
    calories: intake.calories,
    protein: intake.protein,
    carbs: intake.carbs,
    fat: intake.fat,
  };

  let headline = viewingToday ? 'Today’s total' : 'Day total';
  let detail = '';
  let action = '';

  if (intake.calories === 0) {
    detail = `Budget is ${targetKcal} kcal (~${weekRate} lb/week down at a ${coach.deficit} deficit).`;
    action = 'Log breakfast when you can — the coach gets smarter with real days.';
  } else if (remaining > 450) {
    detail = `${remaining} kcal still open. Protein left: ${Math.max(0, proteinLeft)}g.`;
    action =
      proteinLeft > 30
        ? 'Anchor the next meal with protein first, then fill carbs around training.'
        : 'Plenty of room — keep portions honest and finish near the budget.';
  } else if (remaining >= 0) {
    detail = `${remaining} kcal left against a ${targetKcal} target.`;
    action =
      proteinLeft > 20
        ? `Hit ~${Math.ceil(proteinLeft)}g more protein and you’re done for fat loss.`
        : 'You’re in the landing zone — small finish is fine.';
  } else {
    detail = `${Math.abs(remaining)} kcal over today’s target — still useful data.`;
    action = 'No make-up needed. Keep logging; weekly average drives the coach.';
  }

  let strategy = '';
  if (expenditureInfo.source === 'trend') {
    strategy = `Maintenance looks like ~${expenditure} kcal from your weigh-ins (${expenditureInfo.lbPerWeek} lb/week trend).`;
  } else if (expenditureInfo.source === 'weight') {
    strategy = `Using ~${expenditure} kcal maintenance from your latest weigh-in (${expenditureInfo.latestWeight} lb).`;
  } else if (expenditureInfo.source === 'manual') {
    strategy = `Using your set maintenance of ${expenditure} kcal.`;
  } else {
    strategy = `Starting from ~${expenditure} kcal maintenance. Weigh in a few times to tighten this.`;
  }

  const targetsDiffer =
    suggested.calories !== targets.calories ||
    suggested.protein !== targets.protein ||
    suggested.carbs !== targets.carbs ||
    suggested.fat !== targets.fat;

  return {
    totals,
    headline,
    detail,
    action,
    strategy,
    weekRate,
    expenditure,
    suggested,
    targetsDiffer,
    remaining,
  };
}
