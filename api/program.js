/**
 * /api/program — JENO creates, updates, deletes, and replaces the weekly
 * program. Same TALLY_INGEST_KEY as /api/ingest.
 *
 * GET    list the program Michael sees (seed until the first write)
 * POST   create one workout
 * PATCH  update one workout by id
 * DELETE delete one workout by id
 * PUT    replace the whole program
 */

import { runProgram } from '../src/lib/programServer.js';

function queryOf(req) {
  const raw = req.query;
  if (raw && typeof raw === 'object') return raw;
  try {
    return Object.fromEntries(new URL(req.url, 'http://localhost').searchParams);
  } catch {
    return {};
  }
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, x-tally-ingest-key');
    return res.status(204).end();
  }
  const result = await runProgram({
    method: req.method,
    headers: req.headers || {},
    body: req.body,
    query: queryOf(req),
    env: process.env,
  });
  if (result.status === 204) return res.status(204).end();
  return res.status(result.status).json(result.body);
}
