import { useEffect, useState } from 'react';
import {
  MACRO_TARGETS_KEY,
  loadMacroTargets,
  loadMacroView,
  saveMacroTargets,
  saveMacroView,
  targetsWithHabitSeed,
} from '../lib/macroTargets';

/**
 * Local calorie/macro targets + Consumed/Remaining preference.
 * Kept out of DataProvider so it stays a light Calories-tab concern.
 */
export function useMacroTargets(proteinHabitTarget) {
  const [targets, setTargets] = useState(() =>
    targetsWithHabitSeed(loadMacroTargets(), proteinHabitTarget)
  );
  const [view, setViewState] = useState(() => loadMacroView());

  useEffect(() => {
    if (localStorage.getItem(MACRO_TARGETS_KEY)) return;
    if (!(proteinHabitTarget > 0)) return;
    setTargets((current) => {
      const next = { ...current, protein: proteinHabitTarget };
      return saveMacroTargets(next);
    });
  }, [proteinHabitTarget]);

  const updateTargets = (patch) => {
    setTargets((current) => saveMacroTargets({ ...current, ...patch }));
  };

  const setView = (next) => {
    setViewState(saveMacroView(next));
  };

  return { targets, updateTargets, view, setView };
}
