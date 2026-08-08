import { useMemo, useState } from 'react';
import { useData } from '../context/DataProvider';
import { addDays, formatLong, relativeDay, todayISO } from '../lib/dates';
import { NutritionTracker } from './NutritionTracker';

const MACRO_METERS = [
  { id: 'protein', label: 'Protein', unit: 'g', tone: 'blue' },
  { id: 'carbs', label: 'Carbs', unit: 'g', tone: 'pink' },
  { id: 'fat', label: 'Fat', unit: 'g', tone: 'violet' },
];

/**
 * Dedicated calorie / food diary tab. Same day navigation as Today, focused
 * only on logging meals and portions.
 */
export function CaloriesView() {
  const { nutritionFor } = useData();
  const calendarToday = todayISO();
  const [day, setDay] = useState(calendarToday);
  const entry = useMemo(() => nutritionFor(day), [nutritionFor, day]);
  const viewingToday = day === calendarToday;
  const canGoForward = day < calendarToday;

  const goPrev = () => setDay((d) => addDays(d, -1));
  const goNext = () => {
    if (canGoForward) setDay((d) => addDays(d, 1));
  };

  const calories = Math.round(entry.calories || 0);
  const hasData =
    calories > 0 ||
    entry.protein > 0 ||
    (entry.meals && entry.meals.some((meal) => (meal.foods && meal.foods.length) || meal.calories > 0));

  const macroMax = Math.max(
    1,
    Number(entry.protein) || 0,
    Number(entry.carbs) || 0,
    Number(entry.fat) || 0
  );

  return (
    <section className="view calories-view">
      <header className="calories-hero">
        <div className="day-nav">
          <button type="button" className="day-nav__btn" onClick={goPrev} aria-label="Previous day">
            ‹
          </button>
          <div className="day-nav__center">
            <p className="eyebrow">{formatLong(day)}</p>
            {!viewingToday && (
              <button
                type="button"
                className="day-nav__today"
                onClick={() => setDay(calendarToday)}
              >
                Back to today
              </button>
            )}
          </div>
          <button
            type="button"
            className="day-nav__btn"
            onClick={goNext}
            disabled={!canGoForward}
            aria-label="Next day"
          >
            ›
          </button>
        </div>

        <div className="calories-hero__total">
          <p className="eyebrow">
            {viewingToday ? 'Calories today' : `Calories · ${relativeDay(day, calendarToday)}`}
          </p>
          <h1 className="calories-hero__kcal">
            {hasData ? (
              <>
                <span className="calories-hero__num">{calories}</span>
                <em>kcal</em>
              </>
            ) : (
              <>
                Log <em>food</em>
              </>
            )}
          </h1>
          <p className="calories-hero__cue">
            {hasData
              ? 'Totals update as you add foods'
              : 'Search under a meal — calories and macros fill in'}
          </p>
        </div>

        <ul className="macro-meters" aria-label="Day macros">
          {MACRO_METERS.map(({ id, label, unit, tone }) => {
            const value = Number(entry[id]) || 0;
            const fill = hasData ? Math.round((value / macroMax) * 100) : 0;
            return (
              <li key={id} className={`macro-meter macro-meter--${tone}`}>
                <div className="macro-meter__row">
                  <span className="macro-meter__label">{label}</span>
                  <span className="macro-meter__value">
                    {Math.round(value * 10) / 10}
                    {unit}
                  </span>
                </div>
                <span className="macro-meter__track" aria-hidden="true">
                  <span className="macro-meter__ink" style={{ '--fill': `${fill}%` }} />
                </span>
              </li>
            );
          })}
        </ul>
      </header>

      <NutritionTracker day={day} standalone />
    </section>
  );
}
