/**
 * Cold-start suggestions when the user has no recent foods yet —
 * one tap instead of staring at an empty search box.
 */

import { searchLocalFoods } from './foodSearch.js';

const STARTERS = [
  'chicken breast',
  'eggs',
  'greek yogurt',
  'oats',
  'banana',
  'white rice',
  'whey protein',
  'peanut butter',
];

export function starterFoods(limit = 8) {
  const seen = new Set();
  const out = [];
  for (const query of STARTERS) {
    const hit = searchLocalFoods(query, 1)[0];
    if (!hit) continue;
    const key = `${hit.name}|${hit.brand}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...hit, source: hit.source || 'local', starter: true });
    if (out.length >= limit) break;
  }
  return out;
}
