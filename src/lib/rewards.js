/**
 * Treats for closed days — stamps you keep even when a streak breaks.
 *
 * Currency is lifetime perfect days, not a live chain. Nothing here is random,
 * purchasable, or hidden behind a loot box: close the day, earn the stamp.
 * Thirty closed days unlock gold ink, the one extra colour the press earns.
 */

export const SEEN_KEY = 'tally-treats-seen';

/** Headline unlock: this many closed days turn the third ink on. */
export const GOLD_AT = 30;

export const TREATS = [
  {
    at: 1,
    id: 'first',
    name: 'First stamp',
    line: 'You closed a day. That’s the whole game.',
  },
  {
    at: 3,
    id: 'three',
    name: 'Warm plate',
    line: 'Three closed days. The ink is catching.',
  },
  {
    at: 7,
    id: 'week',
    name: 'A week',
    line: 'Seven stamps. A week of showing up.',
  },
  {
    at: 14,
    id: 'fortnight',
    name: 'Two weeks',
    line: 'Fourteen. The stack is getting thick.',
  },
  {
    at: 30,
    id: 'thirty',
    name: 'Thirty',
    line: 'Gold ink. Thirty closed days unlock it.',
    unlock: 'gold',
  },
  {
    at: 60,
    id: 'sixty',
    name: 'Sixty',
    line: 'Two months of stamps. Keep the press warm.',
  },
  {
    at: 100,
    id: 'hundred',
    name: 'A hundred',
    line: 'A hundred closed days. That’s a body of work.',
  },
];

export function treatsEarned(count) {
  return TREATS.filter((treat) => count >= treat.at);
}

export function nextTreat(count) {
  return TREATS.find((treat) => count < treat.at) || null;
}

export function highestTreat(count) {
  const earned = treatsEarned(count);
  return earned[earned.length - 1] || null;
}

export function rewardSkin(count) {
  return count >= GOLD_AT ? 'gold' : null;
}

export function applyRewardSkin(count, root = typeof document === 'undefined' ? null : document.documentElement) {
  if (!root) return;
  const skin = rewardSkin(count);
  if (skin) root.setAttribute('data-reward', skin);
  else root.removeAttribute('data-reward');
}

function getStore(store) {
  if (store) return store;
  if (typeof localStorage === 'undefined') {
    return { getItem: () => null, setItem() {} };
  }
  return localStorage;
}

export function loadSeenTreats(store) {
  try {
    const raw = getStore(store).getItem(SEEN_KEY);
    if (raw === null || raw === undefined) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function saveSeenTreats(ids, store) {
  getStore(store).setItem(SEEN_KEY, JSON.stringify([...new Set(ids)]));
}

/**
 * First launch after this feature: mark already-earned treats as seen so a
 * long history does not dump a stack of overlays on the next close.
 */
export function hydrateTreatsSeen(count, store) {
  const existing = loadSeenTreats(store);
  if (existing !== null) return existing;
  const ids = treatsEarned(count).map((treat) => treat.id);
  saveSeenTreats(ids, store);
  return ids;
}

/** Highest treat whose threshold this close just crossed, or null. */
export function treatJustUnlocked(count, store) {
  const existing = loadSeenTreats(store);
  const seen = new Set(existing ?? []);
  const fresh = treatsEarned(count).filter((treat) => !seen.has(treat.id));
  if (fresh.length === 0) return null;
  saveSeenTreats([...seen, ...fresh.map((treat) => treat.id)], store);
  return fresh[fresh.length - 1];
}
