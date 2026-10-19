/**
 * Optional owner-lock helpers. The app does not call these.
 *
 * supabase/lock-owner-rls.sql and supabase/backfill-owner.sql can still close
 * the database to one signed-in user. The household app syncs without them.
 * OWNER_TABLES is the list those optional scripts must cover.
 */

export const OWNER_TABLES = [
  'habits',
  'habit_logs',
  'goals',
  'identity',
  'day_notes',
  'reviews',
  'nutrition_logs',
  'lift_logs',
  'tasks',
  'calendar_events',
  'books',
  'job_apps',
  'finance_accounts',
  'finance_entries',
  'finance_budgets',
  'grocery_items',
  'life_notes',
  'board_cards',
  'daily_nutrition',
  'workout_logs',
  'watch_entries',
];

export const OWNER_BACKFILL_MESSAGE =
  'Existing cloud rows are not on this account yet. In the Supabase SQL editor, run supabase/lock-owner-rls.sql and then supabase/backfill-owner.sql, then tap Sync now. Nothing on this device was overwritten.';

export function interpretSyncReady(result) {
  const error = result?.error;
  if (!error) {
    const ready = result?.data === true;
    return {
      ready,
      message: ready ? '' : OWNER_BACKFILL_MESSAGE,
    };
  }
  const blob = `${error.code || ''} ${error.message || ''} ${error.details || ''}`;
  const missing =
    error.code === 'PGRST202' ||
    (/sync_ready/i.test(blob) && /not find|does not exist|schema cache|404/i.test(blob));
  return {
    ready: false,
    message: missing ? OWNER_BACKFILL_MESSAGE : error.message || 'Could not reach the sync server.',
  };
}

export async function ownerSyncGate(client) {
  if (!client) {
    return { ready: false, message: 'Cloud sync is not configured.' };
  }
  try {
    const result = await client.rpc('sync_ready');
    return interpretSyncReady(result);
  } catch (err) {
    return { ready: false, message: err?.message || 'Could not reach the sync server.' };
  }
}
