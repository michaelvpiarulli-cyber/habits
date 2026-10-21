import { useLife } from '../context/LifeProvider';
import { formatLong } from '../lib/dates';
import { inboxItems } from '../lib/inbox';
import { useJenoActivity } from './hooks';

function detailLines(item) {
  const foods = item.detail?.foods;
  if (Array.isArray(foods) && foods.length) return foods.slice(0, 8);
  const meals = item.detail?.meals;
  if (Array.isArray(meals)) {
    return meals.flatMap((meal) =>
      Array.isArray(meal.foods) && meal.foods.length
        ? meal.foods.map((food) => `${meal.name}: ${food.name}`)
        : [meal.name]
    ).slice(0, 8);
  }
  if (item.detail?.name) return [item.detail.name];
  if (Array.isArray(item.detail?.names)) return item.detail.names;
  return [];
}

export function JenoScreen() {
  const life = useLife();
  const remote = useJenoActivity();
  const items = inboxItems({ activity: remote.activity, nutrition: life.dailyNutrition });

  return (
    <div className="board">
      {remote.warning ? <p className="error">{remote.warning}</p> : null}
      {items.length === 0 ? (
        <p className="quiet">Nothing yet.</p>
      ) : (
        <ul className="food-list">
          {items.slice(0, 30).map((item) => (
            <li key={item.id}>
              <div>
                <strong>{item.summary}</strong>
                <div className="faint">
                  {item.kind === 'nutrition' ? 'Food' : 'Workout'}
                  {item.day ? ` · ${formatLong(item.day)}` : ''}
                </div>
                {detailLines(item).length > 0 && (
                  <div className="quiet">{detailLines(item).join(' · ')}</div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
