import { useMemo, useState } from 'react';
import { useData } from '../context/DataProvider';
import { useMacroTargets } from '../hooks/useMacroTargets';
import { addDays, formatLong, todayISO } from '../lib/dates';
import { findWeighHabit, weighReadings } from '../lib/weightCoach';
import { MacroDashboard } from './MacroDashboard';
import { NutritionTracker } from './NutritionTracker';
import { WeightCoach } from './WeightCoach';

/**
 * MacroFactor-style food log: day totals, fat-loss coach, rings, diary.
 */
export function CaloriesView() {
  const { nutritionFor, activeHabits, logFor } = useData();
  const calendarToday = todayISO();
  const [day, setDay] = useState(calendarToday);
  const entry = useMemo(() => nutritionFor(day), [nutritionFor, day]);
  const viewingToday = day === calendarToday;
  const canGoForward = day < calendarToday;

  const proteinHabitTarget = useMemo(() => {
    const habit = activeHabits.find(
      (item) => item.kind === 'amount' && /protein/i.test(item.name)
    );
    return Number(habit?.target) || 0;
  }, [activeHabits]);

  const weighHabit = useMemo(() => findWeighHabit(activeHabits), [activeHabits]);
  const readings = useMemo(
    () => weighReadings(weighHabit, logFor, calendarToday, 56),
    [weighHabit, logFor, calendarToday]
  );

  const { targets, updateTargets, view, setView } = useMacroTargets(proteinHabitTarget);

  const goPrev = () => setDay((d) => addDays(d, -1));
  const goNext = () => {
    if (canGoForward) setDay((d) => addDays(d, 1));
  };

  return (
    <section className="view calories-view calories-view--mf">
      <header className="calories-hero calories-hero--mf">
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

        <WeightCoach
          entry={entry}
          targets={targets}
          onApplyTargets={updateTargets}
          readings={readings}
          nutritionFor={nutritionFor}
          proteinHabitTarget={proteinHabitTarget}
          viewingToday={viewingToday}
        />

        <MacroDashboard
          entry={entry}
          targets={targets}
          view={view}
          onViewChange={setView}
          onSaveTargets={updateTargets}
        />
      </header>

      <NutritionTracker day={day} standalone />
    </section>
  );
}
