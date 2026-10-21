import { useData } from '../context/DataProvider';
import { useLife } from '../context/LifeProvider';
import { addDays, formatLong, formatShort, todayISO } from '../lib/dates';
import { FOOD_GOALS, ingestedFoodForDay, preferFoodEntry } from '../lib/foodGoals';
import { DayTotal } from './DayTotal';
import { MfpSyncCard } from './MfpSyncCard';

function foodOn(dailyNutrition, nutritionFor, day) {
  return preferFoodEntry(ingestedFoodForDay(dailyNutrition, day), nutritionFor(day));
}

export function FoodScreen() {
  const today = todayISO();
  const { nutritionFor } = useData();
  const { dailyNutrition } = useLife();
  const food = foodOn(dailyNutrition, nutritionFor, today);
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = addDays(today, index - 6);
    const entry = foodOn(dailyNutrition, nutritionFor, day);
    return { day, calories: Math.max(0, Number(entry?.calories) || 0) };
  });

  return (
    <div className="food-page">
      <DayTotal entry={food} />
      <div className="week-bars" aria-label="Seven day calorie totals">
        {days.map((item) => {
          const rounded = Math.round(item.calories);
          const ratio = Math.min(100, Math.round((item.calories / FOOD_GOALS.calories) * 100));
          const label = `${formatLong(item.day)}, ${rounded.toLocaleString('en-US')} of ${FOOD_GOALS.calories.toLocaleString('en-US')} kcal`;
          return (
            <div
              className={`week-bar${item.day === today ? ' is-today' : ''}${rounded > FOOD_GOALS.calories ? ' is-over' : ''}`}
              key={item.day}
            >
              <div className="track" role="img" aria-label={label}>
                <span style={{ height: `${ratio}%` }} />
              </div>
              <span className="label">{formatShort(item.day)}</span>
            </div>
          );
        })}
      </div>
      <MfpSyncCard variant="food" />
    </div>
  );
}
