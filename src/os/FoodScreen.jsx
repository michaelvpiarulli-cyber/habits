import { useData } from '../context/DataProvider';
import { useLife } from '../context/LifeProvider';
import { addDays, formatLong, formatShort } from '../lib/dates';
import { FOOD_GOALS, ingestedFoodForDay, preferFoodEntry } from '../lib/foodGoals';
import { DayTotal } from './DayTotal';
import { MfpSyncCard } from './MfpSyncCard';
import { useViewDay } from './useViewDay';

function foodOn(dailyNutrition, nutritionFor, day) {
  return preferFoodEntry(ingestedFoodForDay(dailyNutrition, day), nutritionFor(day));
}

export function FoodScreen({ onOpenDay }) {
  const { day, today, go } = useViewDay();
  const { nutritionFor } = useData();
  const { dailyNutrition } = useLife();
  const food = foodOn(dailyNutrition, nutritionFor, day);
  const days = Array.from({ length: 7 }, (_, index) => {
    const itemDay = addDays(day, index - 6);
    const entry = foodOn(dailyNutrition, nutritionFor, itemDay);
    return { day: itemDay, calories: Math.max(0, Number(entry?.calories) || 0) };
  });

  const open = (next) => {
    go(next);
    onOpenDay?.();
  };

  return (
    <div className="food-page">
      {day !== today ? <p className="quiet">{formatLong(day)}</p> : null}
      <DayTotal entry={food} />
      <div className="week-bars" aria-label="Seven day calorie totals">
        {days.map((item) => {
          const rounded = Math.round(item.calories);
          const ratio = Math.min(100, Math.round((item.calories / FOOD_GOALS.calories) * 100));
          const label = `${formatLong(item.day)}, ${rounded.toLocaleString('en-US')} of ${FOOD_GOALS.calories.toLocaleString('en-US')} kcal`;
          const selected = item.day === day;
          return (
            <button
              type="button"
              className={`week-bar${selected ? ' is-on' : ''}${item.day === today ? ' is-today' : ''}${rounded > FOOD_GOALS.calories ? ' is-over' : ''}`}
              key={item.day}
              aria-label={label}
              aria-pressed={selected}
              onClick={() => open(item.day)}
            >
              <span className="track" aria-hidden="true">
                <span style={{ height: `${ratio}%` }} />
              </span>
              <span className="label">{formatShort(item.day)}</span>
            </button>
          );
        })}
      </div>
      <MfpSyncCard variant="food" />
    </div>
  );
}
