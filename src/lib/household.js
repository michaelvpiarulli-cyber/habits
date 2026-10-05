/**
 * Personal single-household mode.
 *
 * One shared owner id for every device. No sign-in — the anon key writes
 * under this id, and Supabase RLS is opened for the household (see
 * supabase/add-household-open.sql).
 */

export const HOUSEHOLD_OWNER_ID = 'a1111111-1111-4111-8111-111111111111';
export const HOUSEHOLD_EMAIL = 'household@tally.app';
export const HOUSEHOLD_LABEL = 'Household';
