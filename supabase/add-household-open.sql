-- Retired.
--
-- This file used to seed a shared household login and open every table to the
-- public anon key. That is no longer safe. Running it does not reopen the
-- database.
--
-- Use supabase/lock-owner-rls.sql, then supabase/backfill-owner.sql.
-- See the README section "Private sync".

do $$
begin
  raise exception
    'add-household-open.sql is retired and did not change anything. Run supabase/lock-owner-rls.sql, then supabase/backfill-owner.sql.';
end $$;
