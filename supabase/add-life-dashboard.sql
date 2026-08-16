-- Tally — life dashboard tables (tasks, calendar, books, jobs, finance)
-- Run this once in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Safe to re-run. Existing habit / nutrition / lift tables are untouched.
--
-- Same contract as the rest of Tally: client-generated uuids, soft deletes,
-- last-write-wins via updated_at, and RLS so a signed-in user can only ever
-- touch their own rows.

-- ----------------------------------------------------------------- tasks ----
-- A to-do with an optional due date/time. The calendar reads due dates; Google
-- Calendar is an optional mirror via google_event_id, not the source of truth.

create table if not exists public.tasks (
  id               uuid primary key,
  user_id          uuid        not null references auth.users (id) on delete cascade,
  title            text        not null,
  notes            text,
  due_date         date,
  due_time         text        check (due_time is null or due_time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  list             text        not null default 'inbox'
                     check (list in ('inbox', 'work', 'personal', 'errands')),
  priority         text        not null default 'none'
                     check (priority in ('none', 'low', 'medium', 'high')),
  done             boolean     not null default false,
  completed_at     timestamptz,
  google_event_id  text,
  deleted          boolean     not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists tasks_user_due_idx
  on public.tasks (user_id, due_date);

-- -------------------------------------------------------- calendar_events --
-- Meetings and appointments that are not tasks. All-day when start_time is
-- null. Google is again an optional mirror.

create table if not exists public.calendar_events (
  id               uuid primary key,
  user_id          uuid        not null references auth.users (id) on delete cascade,
  title            text        not null,
  notes            text,
  day              date        not null,
  start_time       text        check (start_time is null or start_time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  end_time         text        check (end_time is null or end_time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  all_day          boolean     not null default true,
  location         text,
  google_event_id  text,
  deleted          boolean     not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists calendar_events_user_day_idx
  on public.calendar_events (user_id, day);

-- ------------------------------------------------------------------ books --

create table if not exists public.books (
  id           uuid primary key,
  user_id      uuid        not null references auth.users (id) on delete cascade,
  title        text        not null,
  author       text,
  total_pages  integer     not null default 0 check (total_pages >= 0),
  current_page integer     not null default 0 check (current_page >= 0),
  status       text        not null default 'queued'
                 check (status in ('queued', 'reading', 'paused', 'done')),
  started_on   date,
  finished_on  date,
  notes        text,
  deleted      boolean     not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists books_user_status_idx
  on public.books (user_id, status);

-- --------------------------------------------------------------- job_apps --

create table if not exists public.job_apps (
  id               uuid primary key,
  user_id          uuid        not null references auth.users (id) on delete cascade,
  company          text        not null,
  role             text        not null,
  status           text        not null default 'saved'
                     check (status in (
                       'saved', 'applied', 'screen', 'interview',
                       'offer', 'accepted', 'rejected', 'withdrawn'
                     )),
  url              text,
  location         text,
  salary           text,
  applied_on       date,
  due_date         date,
  notes            text,
  google_event_id  text,
  deleted          boolean     not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists job_apps_user_status_idx
  on public.job_apps (user_id, status);
create index if not exists job_apps_user_due_idx
  on public.job_apps (user_id, due_date);

-- ------------------------------------------------------- finance_accounts --
-- Opening balance plus later entries is the live figure. Money is numeric,
-- never float.

create table if not exists public.finance_accounts (
  id               uuid primary key,
  user_id          uuid        not null references auth.users (id) on delete cascade,
  name             text        not null,
  kind             text        not null default 'checking'
                     check (kind in ('checking', 'savings', 'credit', 'cash', 'other')),
  opening_balance  numeric(14, 2) not null default 0,
  currency         text        not null default 'USD',
  deleted          boolean     not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists finance_accounts_user_idx
  on public.finance_accounts (user_id);

-- -------------------------------------------------------- finance_entries --

create table if not exists public.finance_entries (
  id          uuid primary key,
  user_id     uuid        not null references auth.users (id) on delete cascade,
  account_id  uuid        references public.finance_accounts (id) on delete set null,
  day         date        not null,
  amount      numeric(14, 2) not null check (amount >= 0),
  direction   text        not null default 'out'
                check (direction in ('in', 'out')),
  category    text        not null default 'Other',
  payee       text,
  notes       text,
  deleted     boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists finance_entries_user_day_idx
  on public.finance_entries (user_id, day);
create index if not exists finance_entries_account_idx
  on public.finance_entries (account_id);

-- -------------------------------------------------------- finance_budgets --
-- One living row per category per month (first-of-month date).

create table if not exists public.finance_budgets (
  id          uuid primary key,
  user_id     uuid        not null references auth.users (id) on delete cascade,
  category    text        not null,
  month       date        not null,
  amount      numeric(14, 2) not null default 0 check (amount >= 0),
  deleted     boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index if not exists finance_budgets_user_month_cat_alive_idx
  on public.finance_budgets (user_id, month, category)
  where not deleted;

create index if not exists finance_budgets_user_month_idx
  on public.finance_budgets (user_id, month);

-- ------------------------------------------------------------------ RLS ----

alter table public.tasks             enable row level security;
alter table public.calendar_events   enable row level security;
alter table public.books             enable row level security;
alter table public.job_apps          enable row level security;
alter table public.finance_accounts  enable row level security;
alter table public.finance_entries   enable row level security;
alter table public.finance_budgets   enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'tasks', 'calendar_events', 'books', 'job_apps',
    'finance_accounts', 'finance_entries', 'finance_budgets'
  ] loop
    execute format('drop policy if exists "own rows read"   on public.%I', t);
    execute format('drop policy if exists "own rows insert" on public.%I', t);
    execute format('drop policy if exists "own rows update" on public.%I', t);
    execute format('drop policy if exists "own rows delete" on public.%I', t);

    -- auth.uid() wrapped in a select so Postgres caches it per statement.
    execute format(
      'create policy "own rows read" on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "own rows insert" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "own rows update" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "own rows delete" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t);
  end loop;
end $$;

grant select, insert, update, delete on public.tasks to anon, authenticated;
grant select, insert, update, delete on public.calendar_events to anon, authenticated;
grant select, insert, update, delete on public.books to anon, authenticated;
grant select, insert, update, delete on public.job_apps to anon, authenticated;
grant select, insert, update, delete on public.finance_accounts to anon, authenticated;
grant select, insert, update, delete on public.finance_entries to anon, authenticated;
grant select, insert, update, delete on public.finance_budgets to anon, authenticated;

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
$$;
