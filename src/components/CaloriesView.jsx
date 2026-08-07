import { useMemo, useState } from 'react';
import { useData } from '../context/DataProvider';
import { addDays, formatLong, relativeDay, todayISO } from '../lib/dates';
import { NutritionTracker } from './NutritionTracker';

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

  const hasData =
    entry.calories > 0 ||
    entry.protein > 0 ||
    (entry.meals && entry.meals.some((meal) => (meal.foods && meal.foods.length) || meal.calories > 0));

  return (
    <section className="view calories-view">
      <header className="view__head">
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
        <h1 className="view__title">
          {hasData ? (
            <>
              {Math.round(entry.calories || 0)} <em>kcal</em>
            </>
          ) : (
            <>
              Log <em>food</em>
            </>
          )}
        </h1>
        <p className="calories-view__sub">
          {hasData
            ? `${entry.protein || 0}g protein · ${entry.carbs || 0}g carbs · ${entry.fat || 0}g fat`
            : `${relativeDay(day, calendarToday)} — type a food to pull calories`}
        </p>
      </header>

      <NutritionTracker day={day} standalone />
    </section>
  );
}
