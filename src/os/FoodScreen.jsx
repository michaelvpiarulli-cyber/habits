import { useData } from '../context/DataProvider';
import { useLife } from '../context/LifeProvider';
import { todayISO } from '../lib/dates';
import { ingestedFoodForDay, preferFoodEntry } from '../lib/foodGoals';
import { FoodCard } from './ui';

export function FoodScreen() {
  const today = todayISO();
  const { nutritionFor } = useData();
  const { dailyNutrition } = useLife();
  const ingested = ingestedFoodForDay(dailyNutrition, today);
  const food = preferFoodEntry(ingested, nutritionFor(today));

  return (
    <div className="board">
      <FoodCard entry={food} source={food?.source} />
    </div>
  );
}
