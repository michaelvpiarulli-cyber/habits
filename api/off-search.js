/**
 * Proxy Open Food Facts search-a-licious (3.5M+ products) so the browser
 * can search the million-food universe without CORS issues.
 */

import { mapOpenFoodFactsHit } from '../src/lib/openFoodFacts.js';

const OFF_SEARCH = 'https://search.openfoodfacts.org/search';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    return res.status(204).end();
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const q = String(req.query.q || '').trim();
  const limit = Math.min(40, Math.max(1, Number(req.query.limit) || 20));
  if (q.length < 2) {
    return res.status(200).json({ foods: [], count: 0, universe: 3_500_000 });
  }

  const params = new URLSearchParams({
    q,
    page_size: String(limit),
    langs: 'en',
  });

  try {
    const upstream = await fetch(`${OFF_SEARCH}?${params}`, {
      headers: { 'User-Agent': 'TallyHabits/1.0 (calorie diary; +https://github.com)' },
    });
    if (!upstream.ok) {
      const text = await upstream.text();
      return res.status(upstream.status).json({ error: text || 'Open Food Facts error' });
    }
    const data = await upstream.json();
    const foods = (data.hits || [])
      .map(mapOpenFoodFactsHit)
      .filter((food) => food.name && (food.calories > 0 || food.protein > 0))
      .slice(0, limit);
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=86400');
    return res.status(200).json({
      foods,
      count: Number(data.count) || foods.length,
      universe: 3_500_000,
      source: 'openfoodfacts',
    });
  } catch (err) {
    return res.status(502).json({ error: err.message || 'Food search failed' });
  }
}
