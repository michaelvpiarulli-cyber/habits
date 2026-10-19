/**
 * Retired shared owner.
 *
 * Older builds wrote every device's rows under this fixed auth user and opened
 * RLS to the anon key. It is not a session. Sign-in uses the real Supabase
 * user; supabase/backfill-owner.sql reassigns rows that still carry this id.
 * The uuid stays in the client so a device can fold the local cache that was
 * stored under it.
 */

export const HOUSEHOLD_OWNER_ID = 'a1111111-1111-4111-8111-111111111111';
export const HOUSEHOLD_EMAIL = 'household@tally.app';
