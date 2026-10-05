-- Tally — kanban board cards + book cover URLs
-- Run once in the Supabase SQL editor, or via apply_migration.
-- Safe to re-run. Existing habit / life tables are untouched.
--
-- Same contract as the rest of Tally: client-generated uuids, soft deletes,
-- last-write-wins via updated_at, and RLS so a signed-in user can only ever
-- touch their own rows.
--
-- Cover images are resized client-side to small JPEG data URLs and stored
-- on books.cover_url (text). No separate blob store.

-- -------------------------------------------------------------- board_cards --

create table if not exists public.board_cards (
  id          uuid primary key,
  user_id     uuid        not null references auth.users (id) on delete cascade,
  title       text        not null,
  notes       text,
  column_id   text        not null default 'backlog'
                check (column_id in ('backlog', 'doing', 'done')),
  due_date    date,
  sort_order  integer     not null default 0,
  deleted     boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists board_cards_user_column_idx
  on public.board_cards (user_id, column_id, sort_order)
  where not deleted;

create index if not exists board_cards_user_due_idx
  on public.board_cards (user_id, due_date)
  where not deleted and due_date is not null;

alter table public.board_cards enable row level security;

do $$
declare t text := 'board_cards';
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

grant select, insert, update, delete on public.board_cards to anon, authenticated;

-- -------------------------------------------------------- books.cover_url --

alter table public.books
  add column if not exists cover_url text;

-- -------------------------------------------------------------- clean-up ----

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
  delete from public.life_notes       where deleted and updated_at < now() - older_than;
  delete from public.board_cards      where deleted and updated_at < now() - older_than;
$$;
