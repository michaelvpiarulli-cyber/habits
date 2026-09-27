-- Tally — grocery list table
-- Run this once in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Safe to re-run. Existing habit / life tables are untouched.
--
-- Same contract as the rest of Tally: client-generated uuids, soft deletes,
-- last-write-wins via updated_at, and RLS so a signed-in user can only ever
-- touch their own rows.

-- ------------------------------------------------------------ grocery_items --
-- Shopping list items grouped by aisle. Checked items stay until cleared so
-- you can uncheck a miss; clear-checked soft-deletes them.

create table if not exists public.grocery_items (
  id           uuid primary key,
  user_id      uuid        not null references auth.users (id) on delete cascade,
  name         text        not null,
  quantity     text,
  aisle        text        not null default 'other'
                 check (aisle in (
                   'produce', 'dairy', 'meat', 'bakery', 'frozen',
                   'pantry', 'beverages', 'household', 'other'
                 )),
  notes        text,
  checked      boolean     not null default false,
  checked_at   timestamptz,
  deleted      boolean     not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists grocery_items_user_aisle_idx
  on public.grocery_items (user_id, aisle)
  where not deleted;

alter table public.grocery_items enable row level security;

do $$
declare t text := 'grocery_items';
begin
  execute format('drop policy if exists "own rows read"   on public.%I', t);
  execute format('drop policy if exists "own rows insert" on public.%I', t);
  execute format('drop policy if exists "own rows update" on public.%I', t);
  execute format('drop policy if exists "own rows delete" on public.%I', t);

  execute format(
    'create policy "own rows read" on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t);
  execute format(
    'create policy "own rows insert" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
  execute format(
    'create policy "own rows update" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
  execute format(
    'create policy "own rows delete" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t);
end $$;

grant select, insert, update, delete on public.grocery_items to anon, authenticated;

-- Extend purge_deleted so grocery tombstones age out with the rest.
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
  delete from public.calendar_events  where deleted and updated_at < now() - older_than;
  delete from public.books            where deleted and updated_at < now() - older_than;
  delete from public.job_apps         where deleted and updated_at < now() - older_than;
  delete from public.finance_entries  where deleted and updated_at < now() - older_than;
  delete from public.finance_budgets  where deleted and updated_at < now() - older_than;
  delete from public.finance_accounts where deleted and updated_at < now() - older_than;
  delete from public.grocery_items    where deleted and updated_at < now() - older_than;
$$;
