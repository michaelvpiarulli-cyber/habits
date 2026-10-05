-- Tally — freeform life notes (Notion-like pages)
-- Run once in the Supabase SQL editor, or via apply_migration.
-- Safe to re-run. Existing habit / life tables are untouched.
--
-- Same contract as the rest of Tally: client-generated uuids, soft deletes,
-- last-write-wins via updated_at, and RLS so a signed-in user can only ever
-- touch their own rows.
--
-- day_notes stay day-keyed reflections on Today. life_notes are standalone
-- pages you browse and edit like a quiet notebook.

-- -------------------------------------------------------------- life_notes --

create table if not exists public.life_notes (
  id          uuid primary key,
  user_id     uuid        not null references auth.users (id) on delete cascade,
  title       text        not null default '',
  body        text        not null default '',
  emoji       text,
  pinned      boolean     not null default false,
  archived    boolean     not null default false,
  deleted     boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists life_notes_user_updated_idx
  on public.life_notes (user_id, updated_at desc)
  where not deleted;

create index if not exists life_notes_user_pinned_idx
  on public.life_notes (user_id, pinned)
  where not deleted and not archived;

alter table public.life_notes enable row level security;

do $$
declare t text := 'life_notes';
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

grant select, insert, update, delete on public.life_notes to anon, authenticated;

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
$$;
