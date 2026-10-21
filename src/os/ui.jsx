import { formatClock } from '../lib/dates';
import { formatMacro, presentMeals } from '../lib/foodLog';
import { formatExercise, patternLabel } from '../lib/program';
import { whenLabel } from '../lib/upcoming';
import { MfpSyncCard } from './MfpSyncCard';

export function Frame({ kicker, title, actions, children }) {
  return (
    <main className="os-scroll">
      <header className="os-head">
        <div>
          <p className="os-kicker">{kicker}</p>
          <h1 className="os-title">{title}</h1>
        </div>
        {actions ? <div className="os-head__actions">{actions}</div> : null}
      </header>
      <div className="board">{children}</div>
    </main>
  );
}

export function Gear() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 3.2v2.3M12 18.5v2.3M3.2 12h2.3M18.5 12h2.3M5.8 5.8l1.6 1.6M16.6 16.6l1.6 1.6M18.2 5.8l-1.6 1.6M7.4 16.6l-1.6 1.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function AgendaList({ items }) {
  if (!items?.length) return <p className="quiet">Nothing scheduled.</p>;
  return (
    <ol className="agenda">
      {items.map((item) => (
        <li key={item.id}>
          <span className="when">{whenLabel(item)}</span>
          <div>
            <strong>{item.title}</strong>
            {item.location ? <div className="faint">{item.location}</div> : null}
            <span className="source">{item.source === 'google' ? 'Google' : 'Tally'}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function FoodCard({ entry, source }) {
  const calories = Math.round(Number(entry?.calories) || 0);
  const protein = Math.round(Number(entry?.protein) || 0);
  const meals = presentMeals(entry);
  return (
    <section className="card" aria-label="Food">
      <div className="card-head">
        <h2>Food</h2>
        <span className="faint">{source === 'mfp' ? 'From MyFitnessPal' : source === 'ingest' ? 'From JENO' : source === 'log' ? 'Logged here' : 'Waiting'}</span>
      </div>
      <div className="meters">
        <div>
          <div className="meter-value">{calories} / 2,100 kcal</div>
          <div className="meter" aria-hidden="true">
            <span style={{ width: `${Math.min(100, Math.round((calories / 2100) * 100))}%` }} />
          </div>
        </div>
        <div>
          <div className="meter-value">{protein} / 210 g</div>
          <div className="meter clay" aria-hidden="true">
            <span style={{ width: `${Math.min(100, Math.round((protein / 210) * 100))}%` }} />
          </div>
        </div>
      </div>
      {meals.length === 0 ? (
        <p className="quiet" style={{ marginTop: 12 }}>
          No meals yet. JENO sends the same foods it logs in MyFitnessPal.
        </p>
      ) : (
        meals.map((meal) => (
          <div className="food-meal" key={`${meal.name}-${meal.calories}`}>
            <div className="row-between">
              <h3>{meal.name}</h3>
              <span className="faint">
                {formatMacro(meal.calories)} kcal · {formatMacro(meal.protein, 1)} g
              </span>
            </div>
            {meal.foods.length > 0 && (
              <ul className="food-list">
                {meal.foods.map((food, index) => (
                  <li key={`${food.name}-${index}`}>
                    <span>{food.name}</span>
                    <small>
                      {formatMacro(food.calories)} kcal · {formatMacro(food.protein, 1)} g
                    </small>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))
      )}
      <MfpSyncCard variant="food" />
    </section>
  );
}

export function WorkoutDetail({ workout }) {
  const windowLabel =
    workout.startTime && workout.endTime
      ? `${formatClock(workout.startTime)} to ${formatClock(workout.endTime)}`
      : '';
  return (
    <article>
      <div className="row-between">
        <h3 className="lede" style={{ fontSize: 20 }}>{workout.name}</h3>
        {workout.exercises?.some((exercise) => exercise.placeholder) ? <span className="chip">Placeholder</span> : null}
      </div>
      <p className="faint">
        {patternLabel(workout)}
        {windowLabel ? ` · ${windowLabel}` : ''}
        {workout.kind === 'cardio' ? ' · Cardio' : ''}
      </p>
      {(workout.exercises || []).map((exercise, index) => (
        <div className="lift" key={`${exercise.name}-${index}`}>
          <strong>{exercise.name}</strong>
          <div className="quiet">{formatExercise(exercise) || 'As written'}</div>
          {exercise.rest ? <div className="faint">Rest {exercise.rest}</div> : null}
          {exercise.notes ? <div className="faint">{exercise.notes}</div> : null}
        </div>
      ))}
    </article>
  );
}
