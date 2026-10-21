import { FOOD_GOALS } from '../lib/foodGoals';

function formatCount(value) {
  return Math.round(Number(value) || 0).toLocaleString('en-US');
}

export function DayTotal({ entry }) {
  const calories = Math.max(0, Number(entry?.calories) || 0);
  const protein = Math.round(Math.max(0, Number(entry?.protein) || 0));
  const goal = FOOD_GOALS.calories;
  const rounded = Math.round(calories);
  const delta = goal - rounded;
  const remainder = delta >= 0
    ? `${formatCount(delta)} left`
    : `${formatCount(-delta)} over`;
  const ratio = goal > 0 ? Math.min(100, Math.round((calories / goal) * 100)) : 0;

  return (
    <div className="day-total">
      <p className="day-figure">{formatCount(rounded)} / {formatCount(goal)} kcal</p>
      <p className="day-left">{remainder}</p>
      <div
        className="meter"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={Math.min(goal, rounded)}
        aria-label={`${formatCount(rounded)} of ${formatCount(goal)} kcal`}
      >
        <span style={{ width: `${ratio}%` }} />
      </div>
      {protein > 0 ? (
        <p className="day-protein">{formatCount(protein)} / {FOOD_GOALS.protein} g</p>
      ) : null}
    </div>
  );
}
