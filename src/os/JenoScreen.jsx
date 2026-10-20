import { useLife } from '../context/LifeProvider';
import { formatLong } from '../lib/dates';
import { inboxItems } from '../lib/inbox';
import { useJenoActivity, useProgram } from './hooks';
import { Frame, Gear } from './ui';

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

export function JenoScreen({ onLog, onSettings }) {
  const life = useLife();
  const remote = useJenoActivity();
  const program = useProgram();
  const items = inboxItems({ activity: remote.activity, nutrition: life.dailyNutrition });

  return (
    <Frame
      kicker="Assistant"
      title="JENO"
      actions={(
        <>
          <button type="button" className="text-btn" onClick={onLog}>Log</button>
          <button type="button" className="icon-btn" aria-label="Settings" onClick={onSettings}><Gear /></button>
        </>
      )}
    >
      <section className="card">
        <p className="lede">{program.source === 'jeno' ? 'Program is JENO’s' : 'Program is the starting seed'}</p>
        <p className="quiet">
          {program.source === 'jeno'
            ? `${program.workouts.length} workouts on the week.`
            : 'Strength A, Strength B, and the morning walk stay until JENO replaces them.'}
        </p>
      </section>
      {remote.warning ? <p className="error">{remote.warning}</p> : null}
      <section className="card">
        <div className="card-head"><h2>Recent</h2></div>
        {items.length === 0 ? (
          <p className="quiet">Nothing from JENO yet. Food entries and workout changes land here.</p>
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
      </section>
    </Frame>
  );
}
