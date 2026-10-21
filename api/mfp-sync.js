/**
 * /api/mfp-sync
 *
 * GET  Vercel cron. Syncs today and yesterday in America/Los_Angeles,
 *      or the last 14 days the first time a username is set.
 * POST Sync now from Settings or Food. Optional JSON `{ "username": "..." }`.
 *
 * Writes daily_nutrition rows with source mfp. JENO ingest rows stay put.
 */

import { runMfpSync } from '../src/lib/mfpSync.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    return res.status(204).end();
  }
  const result = await runMfpSync({
    method: req.method,
    headers: req.headers || {},
    body: req.body,
    env: process.env,
  });
  if (result.status === 204) return res.status(204).end();
  return res.status(result.status).json(result.body);
}
