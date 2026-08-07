/**
 * Vercel serverless food search → USDA FoodData Central.
 * Set USDA_FDC_API_KEY in project env for higher rate limits (free at api.data.gov).
 */

import { mapUsdaFood } from '../src/lib/usdaFood.js';

const USDA_SEARCH = 'https://api.nal.usda.gov/fdc/v1/foods/search';

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
  const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 8));
  if (q.length < 2) {
    return res.status(200).json({ foods: [] });
  }

  const apiKey = process.env.USDA_FDC_API_KEY || process.env.VITE_USDA_API_KEY || 'DEMO_KEY';
  const params = new URLSearchParams({
    api_key: apiKey,
    query: q,
    pageSize: String(limit),
    dataType: 'Survey (FNDDS),Foundation,SR Legacy,Branded',
  });

  try {
    const upstream = await fetch(`${USDA_SEARCH}?${params}`);
    if (!upstream.ok) {
      const text = await upstream.text();
      return res.status(upstream.status).json({ error: text || 'USDA error' });
    }
    const data = await upstream.json();
    const foods = (data.foods || [])
      .map(mapUsdaFood)
      .filter((food) => food.calories > 0 || food.protein > 0)
      .slice(0, limit);
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({ foods });
  } catch (err) {
    return res.status(502).json({ error: err.message || 'Food search failed' });
  }
}
