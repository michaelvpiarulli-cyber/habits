-- Tally — one-time assignment of existing rows to the owner.
--
-- Does not delete rows. It only changes user_id on rows that have no user or
-- that still belong to the retired household account
-- (a1111111-1111-4111-8111-111111111111). updated_at is left alone, so a newer
-- edit already on a device still wins when that device syncs.
--
-- BEFORE YOU RUN THIS
-- 1. Create your user in Authentication → Users (Auto Confirm User on).
-- 2. Run supabase/lock-owner-rls.sql.
-- 3. Replace REPLACE_WITH_YOUR_EMAIL below with that same email. Keep the quotes.
-- 4. Run this whole file in the Supabase SQL editor (it runs as postgres, which
--    can see every row; the anon key cannot).
--
-- Safe to re-run for the same email. It refuses to move rows onto a different
-- account than the one already recorded in private.app_owner.
--
-- After it succeeds, open Tally, sign in, and tap Sync now if Settings still
-- asks for this file. Notices in the SQL editor list how many rows moved.

do $backfill$
declare
  owner_email text := 'REPLACE_WITH_YOUR_EMAIL';
  owner uuid;
  existing uuid;
  household uuid := 'a1111111-1111-4111-8111-111111111111';
  t text;
  moved bigint;
  total bigint := 0;
  tables text[] := array[
    'habits', 'habit_logs', 'goals', 'identity', 'day_notes', 'reviews',
    'nutrition_logs', 'lift_logs',
    'tasks', 'calendar_events', 'books', 'job_apps',
    'finance_accounts', 'finance_entries', 'finance_budgets',
    'grocery_items', 'life_notes', 'board_cards',
    'daily_nutrition', 'workout_logs', 'watch_entries'
  ];
begin
  if owner_email = 'REPLACE_WITH_YOUR_EMAIL' or position('@' in owner_email) = 0 then
    raise exception 'Edit owner_email in supabase/backfill-owner.sql before running it.';
  end if;

  if to_regclass('private.app_owner') is null then
    raise exception 'Run supabase/lock-owner-rls.sql first.';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'habits'
      and policyname = 'household all'
  ) then
    raise exception 'The public household policy is still in place. Run supabase/lock-owner-rls.sql first. No rows were changed.';
  end if;

  select id
  into owner
  from auth.users
  where lower(email) = lower(owner_email)
  order by created_at
  limit 1;

  if owner is null then
    raise exception 'No auth user with email %. Create that user in Authentication → Users first. No rows were changed.', owner_email;
  end if;

  if owner = household then
    raise exception 'Refusing to assign data to the retired household user.';
  end if;

  select user_id into existing from private.app_owner limit 1;
  if existing is not null and existing <> owner then
    raise exception 'Data was already assigned to %. No rows were changed.', existing;
  end if;

  foreach t in array tables loop
    if to_regclass(format('public.%I', t)) is null then
      raise notice 'skip % (table is not in this project)', t;
      continue;
    end if;

    if not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = t
        and column_name = 'user_id'
    ) then
      raise notice 'skip % (no user_id column)', t;
      continue;
    end if;

    execute format(
      'update public.%I set user_id = $1 where user_id is null or user_id = $2',
      t
    )
    using owner, household;

    get diagnostics moved = row_count;
    total := total + moved;
    raise notice 'assigned % rows in %', moved, t;
  end loop;

  insert into private.app_owner (id, user_id)
  values (true, owner)
  on conflict (id) do update
    set user_id = excluded.user_id,
        claimed_at = now();

  insert into private.allowed_emails (email)
  values (lower(owner_email))
  on conflict (email) do nothing;

  raise notice 'done. % rows now belong to % (%)', total, owner_email, owner;
end
$backfill$;

notify pgrst, 'reload schema';
