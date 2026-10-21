/**
 * POST /api/ingest
 *
 * Another assistant can write Michael's daily food totals or mark a workout
 * done. The request must carry the ingest key (Authorization: Bearer, or
 * x-tally-ingest-key). Writes go through database functions with the public
 * anon key. The household id is fixed. No owner lookup.
 */

import { runIngest } from '../src/lib/ingestServer.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, x-tally-ingest-key');
    return res.status(204).end();
  }
  const result = await runIngest({
    method: req.method,
    headers: req.headers || {},
    body: req.body,
    env: process.env,
  });
  if (result.status === 204) return res.status(204).end();
  return res.status(result.status).json(result.body);
}
