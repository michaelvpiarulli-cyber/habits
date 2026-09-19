import { useEffect, useMemo } from 'react';
import { useData } from '../context/DataProvider';
import { applyRewardSkin, hydrateTreatsSeen } from '../lib/rewards';
import { countPerfectDays } from '../lib/streaks';

/** Keeps gold ink on the document once thirty closed days are in the book. */
export function RewardSkin() {
  const { activeHabits, doneSets } = useData();
  const count = useMemo(
    () => countPerfectDays(activeHabits, doneSets),
    [activeHabits, doneSets]
  );

  useEffect(() => {
    hydrateTreatsSeen(count);
    applyRewardSkin(count);
  }, [count]);

  return null;
}
