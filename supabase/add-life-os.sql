-- Life OS tables: ingested daily food totals, workout completions, watch log.
--
-- Safe to re-run. Does not move or delete existing rows.
-- Run this in the Supabase SQL editor after supabase/lock-owner-rls.sql
-- (or before it — lock skips tables that are not created yet, so run lock
-- again after this file if you ran lock first).
--
-- daily_nutrition.day is the calendar date. The ingest API accepts `date`.
-- This table sits beside nutrition_logs (the in-app meal diary). Ingest
-- writes here and does not replace meals you logged by hand.

-- -------------------------------------------------------- daily_nutrition --

create table if not exists public.daily_nutrition (
  id         uuid primary key,
  user_id    uuid        not null references auth.users (id) on delete cascade,
  day        date        not null,
  calories   numeric     not null default 0 check (calories >= 0),
  protein    numeric     not null default 0 check (protein >= 0),
  carbs      numeric     not null default 0 check (carbs >= 0),
  fat        numeric     not null default 0 check (fat >= 0),
  meals      jsonb       not null default '[]'::jsonb,
  deleted    boolean     not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists daily_nutrition_user_day_alive_idx
  on public.daily_nutrition (user_id, day)
  where not deleted;

create index if not exists daily_nutrition_user_day_idx
  on public.daily_nutrition (user_id, day);

-- ----------------------------------------------------------- workout_logs --

create table if not exists public.workout_logs (
  id         uuid primary key,
  user_id    uuid        not null references auth.users (id) on delete cascade,
  day        date        not null,
  plan_id    text        not null,
  done       boolean     not null default false,
  deleted    boolean     not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists workout_logs_user_day_alive_idx
  on public.workout_logs (user_id, day)
  where not deleted;

-- ---------------------------------------------------------- watch_entries --

create table if not exists public.watch_entries (
  id          uuid primary key,
  user_id     uuid        not null references auth.users (id) on delete cascade,
  title       text        not null,
  link        text,
  watched_on  date,
  rating      smallint    check (rating is null or (rating >= 1 and rating <= 5)),
  notes       text,
  deleted     boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists watch_entries_user_watched_idx
  on public.watch_entries (user_id, watched_on desc);

-- ------------------------------------------------------------------ RLS ----

do $$
declare
  t text;
  tables text[] := array['daily_nutrition', 'workout_logs', 'watch_entries'];
begin
  foreach t in array tables loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows read"   on public.%I', t);
    execute format('drop policy if exists "own rows insert" on public.%I', t);
    execute format('drop policy if exists "own rows update" on public.%I', t);
    execute format('drop policy if exists "own rows delete" on public.%I', t);
    execute format('drop policy if exists "household all"   on public.%I', t);

    execute format(
      'create policy "own rows read" on public.%I for select to authenticated using ((select auth.uid()) = user_id)',
      t
    );
    execute format(
      'create policy "own rows insert" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)',
      t
    );
    execute format(
      'create policy "own rows update" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      t
    );
    execute format(
      'create policy "own rows delete" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)',
      t
    );

    execute format('revoke all on table public.%I from anon', t);
    execute format(
      'grant select, insert, update, delete on table public.%I to authenticated',
      t
    );
  end loop;
end $$;

-- The ingest function reads this with the service role. PostgREST may not
-- expose the private schema, so the lookup lives in public and is not granted
-- to browser roles.
create or replace function public.life_os_owner_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select user_id from private.app_owner limit 1;
$$;

revoke all on function public.life_os_owner_id() from public, anon, authenticated;
grant execute on function public.life_os_owner_id() to service_role;

create or replace function public.purge_deleted(older_than interval default '90 days')
returns void
language sql
security invoker
set search_path = public
as $$
  delete from public.habit_logs where deleted and updated_at < now() - older_than;
  delete from public.nutrition_logs where deleted and updated_at < now() - older_than;
  delete from public.lift_logs where deleted and updated_at < now() - older_than;
  delete from public.goals      where deleted and updated_at < now() - older_than;
  delete from public.habits     where deleted and updated_at < now() - older_than;
  delete from public.tasks            where deleted and updated_at < now() - older_than;
  delete from public.grocery_items    where deleted and updated_at < now() - older_than;
  delete from public.calendar_events  where deleted and updated_at < now() - older_than;
  delete from public.books            where deleted and updated_at < now() - older_than;
  delete from public.job_apps         where deleted and updated_at < now() - older_than;
  delete from public.finance_entries  where deleted and updated_at < now() - older_than;
  delete from public.finance_budgets  where deleted and updated_at < now() - older_than;
  delete from public.finance_accounts where deleted and updated_at < now() - older_than;
  delete from public.life_notes       where deleted and updated_at < now() - older_than;
  delete from public.board_cards      where deleted and updated_at < now() - older_than;
  delete from public.daily_nutrition  where deleted and updated_at < now() - older_than;
  delete from public.workout_logs     where deleted and updated_at < now() - older_than;
  delete from public.watch_entries    where deleted and updated_at < now() - older_than;
$$;

revoke all on function public.purge_deleted(interval) from public, anon;
grant execute on function public.purge_deleted(interval) to authenticated;

notify pgrst, 'reload schema';
