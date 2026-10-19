-- Tally — lock the database to the signed-in owner.
-- Safe to re-run. Does not delete rows and does not move them.
--
-- Run this in the Supabase SQL editor AFTER you have created your user,
-- either with Create account on the Tally sign-in screen, or
--   Authentication → Users → Add user → your email, a password,
--   and Auto Confirm User turned on.
-- Then turn off "Allow new users to sign up"
-- (Authentication → Sign In / Providers, or Authentication → Settings).
--
-- Why the order matters: this file installs a trigger that rejects any new
-- auth user whose email is not already in private.allowed_emails. Creating
-- the user first avoids that. The backfill adds your email to the allowlist
-- so the same address can be recreated later if you ever need to.
--
-- If you already ran this file and still need to create the user:
--   insert into private.allowed_emails (email) values ('you@example.com');
-- then add the user in the dashboard, then run supabase/backfill-owner.sql.
--
-- After this file, edit and run supabase/backfill-owner.sql. Until that
-- finishes, the app keeps your on-device copy and refuses to push, so rows
-- that still belong to the old household user are not duplicated.

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to postgres;

-- The future server ingest (not built yet) reads this with the service role
-- and writes user_id to that owner. Callers never choose the user id.
create table if not exists private.app_owner (
  id         boolean primary key default true check (id),
  user_id    uuid not null references auth.users (id),
  claimed_at timestamptz not null default now()
);

alter table private.app_owner enable row level security;
revoke all on table private.app_owner from public, anon, authenticated;

create table if not exists private.allowed_emails (
  email text primary key
);

alter table private.allowed_emails enable row level security;
revoke all on table private.allowed_emails from public, anon, authenticated;

-- Empty allowlist means no new accounts. The retired household id is exempt
-- so a leftover seed insert cannot block this script; that login is banned
-- below and cannot read rows once the open policy is gone.
create or replace function private.restrict_new_users()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.id = 'a1111111-1111-4111-8111-111111111111'::uuid then
    return new;
  end if;

  if exists (
    select 1
    from private.allowed_emails
    where lower(email) = lower(coalesce(new.email, ''))
  ) then
    return new;
  end if;

  raise exception 'Sign-ups are closed. Add the email to private.allowed_emails first.';
end;
$$;

revoke all on function private.restrict_new_users() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant usage on schema private to supabase_auth_admin;
    grant execute on function private.restrict_new_users() to supabase_auth_admin;
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant usage on schema private to service_role;
    grant select on table private.app_owner to service_role;
  end if;
end $$;

drop trigger if exists restrict_tally_signups on auth.users;
create trigger restrict_tally_signups
  before insert on auth.users
  for each row
  execute function private.restrict_new_users();

-- The household password used to live in the repo. Rotate it and ban the
-- account so it can no longer sign in. Rows are left in place for the backfill.
-- pgcrypto lives in the extensions schema on hosted Supabase; fall back to
-- search_path if this project installed it in public instead.
do $$
begin
  begin
    update auth.users
    set encrypted_password = extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf'))
    where id = 'a1111111-1111-4111-8111-111111111111';
  exception
    when undefined_function or invalid_schema_name then
      update auth.users
      set encrypted_password = crypt(gen_random_uuid()::text, gen_salt('bf'))
      where id = 'a1111111-1111-4111-8111-111111111111';
  end;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'auth'
      and table_name = 'users'
      and column_name = 'banned_until'
  ) then
    update auth.users
    set banned_until = 'infinity'
    where id = 'a1111111-1111-4111-8111-111111111111';
  end if;
end $$;

-- ------------------------------------------------------------------ RLS ----
-- Drop the open household policy and any older owner policies, then recreate
-- owner policies for the authenticated role only. anon keeps no grants.

do $$
declare
  t text;
  tables text[] := array[
    'habits', 'habit_logs', 'goals', 'identity', 'day_notes', 'reviews',
    'nutrition_logs', 'lift_logs',
    'tasks', 'calendar_events', 'books', 'job_apps',
    'finance_accounts', 'finance_entries', 'finance_budgets',
    'grocery_items', 'life_notes', 'board_cards'
  ];
begin
  foreach t in array tables loop
    if to_regclass(format('public.%I', t)) is null then
      continue;
    end if;

    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists "own rows read"   on public.%I', t);
    execute format('drop policy if exists "own rows insert" on public.%I', t);
    execute format('drop policy if exists "own rows update" on public.%I', t);
    execute format('drop policy if exists "own rows delete" on public.%I', t);
    execute format('drop policy if exists "household all"   on public.%I', t);
    execute format('drop policy if exists "household read"  on public.%I', t);
    execute format('drop policy if exists "household write" on public.%I', t);

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

-- True only after backfill-owner.sql records this signed-in user. The client
-- will not push until this returns true.
create or replace function public.sync_ready()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.app_owner
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.sync_ready() from public, anon;
grant execute on function public.sync_ready() to authenticated;

do $$
begin
  if to_regprocedure('public.purge_deleted(interval)') is not null then
    revoke all on function public.purge_deleted(interval) from public, anon;
    grant execute on function public.purge_deleted(interval) to authenticated;
  end if;
end $$;

notify pgrst, 'reload schema';
