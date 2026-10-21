-- Tally — life dashboard: habits, goals, tasks, calendar, books, jobs, money
-- Run this once in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Safe to re-run: every statement is guarded.
--
-- Every table is keyed to the shared household user. Row-level security is
-- enabled and opened to the anon key, so the app syncs with no login.
--
-- Ids are uuids generated on the CLIENT (crypto.randomUUID). That is what makes
-- offline work sync cleanly: a habit created with no connection already has its
-- final id, so pushing it later is a plain upsert with nothing to reconcile.
--
-- Deletes are soft (`deleted = true` plus a bumped `updated_at`) rather than
-- real DELETEs. A hard delete on one device is invisible to another device that
-- is offline, and the row would come back on its next push; a tombstone is a
-- normal edit that wins on recency like any other. purge_deleted() at the bottom
-- clears out old tombstones.

-- ---------------------------------------------------------------- habits ----

create table if not exists public.habits (
  id          uuid primary key,
  user_id     uuid        not null references auth.users (id) on delete cascade,
  name        text        not null,
  emoji       text,
  icon        text,
  color       text,

  -- WHEN it is expected:
  -- 'daily'    — every day
  -- 'weekdays' — only on the days listed in weekdays
  -- 'per_week' — per_week times a week, any days
  cadence     text        not null default 'daily'
                check (cadence in ('daily', 'weekdays', 'per_week')),
  weekdays    smallint[]  not null default '{}',  -- 0=Mon … 6=Sun
  per_week    smallint    not null default 3 check (per_week between 1 and 7),

  -- WHAT counts as doing it. Not every habit is a yes/no: "walk after every
  -- meal" is three separate acts, and "185g of protein" is a number you land
  -- on or miss. Tracking those as a single checkbox would either lie about a
  -- partial day or force the target out of the app and into your head.
  -- 'check'   — done or not
  -- 'count'   — tapped up to `target` times (3 walks, 2 lifts)
  -- 'amount'  — a value entered against `target` (8 h, 185 g)
  -- 'measure' — a reading recorded for its trend (weight). Any reading counts
  --             as done; `target` is an optional goal to move toward, never a
  --             daily pass mark.
  kind        text        not null default 'check'
                check (kind in ('check', 'count', 'amount', 'measure')),
  target      numeric     check (target is null or target > 0),
  unit        text,                               -- 'walks', 'h', 'g', 'lb'

  -- The floor: the smallest version that still counts as showing up. A streak
  -- survives a floor day; the completion rate does not count it as a full one.
  -- Without this a 7.5-hour night reads as failure, which is how a system that
  -- should absorb a bad week instead gets abandoned after one.
  floor       numeric     check (floor is null or floor > 0),

  -- Which value this habit is a vote for. The identity a habit serves is the
  -- reason it survives contact with a bad month. The foreign key is added
  -- further down, once public.identity exists.
  identity_id   uuid,

  -- "I will [habit] at [time] in [place]" — an implementation intention.
  cue         text,

  -- Habit stacking: the habit this one follows.
  after_id    uuid        references public.habits (id) on delete set null,

  archived    boolean     not null default false,
  sort_order  integer     not null default 0,
  deleted     boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- count and amount habits are meaningless without a bar to clear. check and
  -- measure habits are fine without one.
  constraint habits_target_required
    check (kind not in ('count', 'amount') or target is not null)
);

-- Added after the first release; safe to re-run.
alter table public.habits
  add column if not exists floor     numeric,
  add column if not exists identity_id uuid,
  add column if not exists cue       text,
  add column if not exists after_id  uuid references public.habits (id) on delete set null;

create index if not exists habits_user_idx on public.habits (user_id);

-- ------------------------------------------------------------ habit_logs ----
-- One row per habit per day it was touched. Absence of a row means "not done"
-- — there is no such thing as an explicit miss, which keeps clearing a day a
-- delete rather than a third state to reason about.
--
-- `amount` carries the value for count and amount habits, and a row can sit
-- BELOW its habit's target: two walks out of three is a real thing that
-- happened, worth recording and worth showing, even though the day is not
-- complete. The app reads those partial days as lighter ink.

create table if not exists public.habit_logs (
  id         uuid primary key,
  user_id    uuid        not null references auth.users (id) on delete cascade,
  habit_id   uuid        not null references public.habits (id) on delete cascade,
  day        date        not null,
  amount     numeric,                             -- optional, pairs with habits.unit
  note       text,
  deleted    boolean     not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Living rows only. Soft-deleted tombstones must not block a later log on the
-- same habit and day (clearing a day writes deleted=true; checking it again
-- inserts a new living row). Safe to re-run: drop the original unique constraint
-- if an older install still has it, then create the partial index.
alter table public.habit_logs drop constraint if exists habit_logs_habit_id_day_key;
create unique index if not exists habit_logs_habit_day_alive_idx
  on public.habit_logs (habit_id, day)
  where not deleted;

create index if not exists habit_logs_user_day_idx on public.habit_logs (user_id, day);

-- ----------------------------------------------------------------- goals ----
-- The longer horizon. A goal counts up to a target; when habit_id is set the
-- app derives progress from that habit's completions instead of asking the user
-- to keep two numbers in step by hand.

create table if not exists public.goals (
  id         uuid primary key,
  user_id    uuid        not null references auth.users (id) on delete cascade,
  title      text        not null,
  detail     text,
  target     numeric     not null default 1 check (target > 0),
  progress   numeric     not null default 0,      -- ignored when habit_id is set
  unit       text,
  habit_id   uuid        references public.habits (id) on delete set null,
  due_date   date,
  done       boolean     not null default false,
  deleted    boolean     not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists goals_user_idx on public.goals (user_id);

-- --------------------------------------------------------------- identity ----
-- What you are trying to be, as opposed to what you are trying to do. Kept
-- apart from habits on purpose: a statement is not something you tick off, and
-- giving it a streak would turn character into a scoreboard.

create table if not exists public.identity (
  id         uuid primary key,
  user_id    uuid        not null references auth.users (id) on delete cascade,
  name       text        not null,
  note       text,
  -- Scripture paired with the statement: a reference and the words themselves,
  -- stored rather than fetched so it reads offline like everything else here.
  verse_ref  text,
  verse_text text,
  sort_order integer     not null default 0,
  deleted    boolean     not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists identity_user_idx on public.identity (user_id);

alter table public.identity
  add column if not exists verse_ref  text,
  add column if not exists verse_text text;

-- habits.identity_id points here. Declared now that both tables exist.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'habits_identity_id_fkey'
  ) then
    alter table public.habits
      add constraint habits_identity_id_fkey
      foreign key (identity_id) references public.identity (id) on delete set null;
  end if;
end $$;

-- ------------------------------------------------------------- day_notes ----
-- A line about the day itself, as opposed to habit_logs.note, which belongs to
-- one habit. One row per day, so the day is the key.

create table if not exists public.day_notes (
  id         uuid primary key,
  user_id    uuid        not null references auth.users (id) on delete cascade,
  day        date        not null,
  text       text        not null default '',
  deleted    boolean     not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, day)
);

create index if not exists day_notes_user_day_idx on public.day_notes (user_id, day);

-- ----------------------------------------------------------------- reviews --
-- The weekly look back, keyed to the Monday of the week it covers. Scored
-- against identity rather than habits: the habit grid already reports whether
-- the reps happened, and the question worth asking on a Sunday is a different
-- one.

create table if not exists public.reviews (
  id          uuid primary key,
  user_id     uuid        not null references auth.users (id) on delete cascade,
  week_start  date        not null,
  held        text        not null default '',  -- what held
  compromised text        not null default '',  -- where it slipped
  focus       text        not null default '',  -- one thing for next week
  scores      jsonb       not null default '{}'::jsonb, -- identityId -> 1..5
  deleted     boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, week_start)
);

create index if not exists reviews_user_week_idx on public.reviews (user_id, week_start);

-- ---------------------------------------------------------- nutrition_logs --
-- One row per day. Meals are logged through the day; calories/protein/carbs/fat
-- are the rolled-up totals so protein habits and charts keep a single number.
-- This stays separate from habits because macros are observations, not four
-- more daily pass/fail obligations.

create table if not exists public.nutrition_logs (
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
  updated_at timestamptz not null default now(),
  unique (user_id, day)
);

-- Existing projects created before meals existed.
alter table public.nutrition_logs
  add column if not exists meals jsonb not null default '[]'::jsonb;

create index if not exists nutrition_logs_user_day_idx
  on public.nutrition_logs (user_id, day);

-- --------------------------------------------------------------- lift_logs --
-- One performance log per movement per day. Separate from habit_logs because
-- the Lift habit only tracks how many movements were completed; progressive
-- overload needs the load and reps that were actually hit.

create table if not exists public.lift_logs (
  id          uuid primary key,
  user_id     uuid        not null references auth.users (id) on delete cascade,
  day         date        not null,
  move        text        not null,
  load_kind   text        not null default 'barbell'
                check (load_kind in ('barbell', 'dumbbell', 'machine', 'bodyweight', 'cardio')),
  load_lb     numeric,
  sets        numeric     check (sets is null or sets > 0),
  reps        numeric     check (reps is null or reps > 0),
  set_entries jsonb       not null default '[]'::jsonb,
  deleted     boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Living rows only. Soft-deleted tombstones must not block a later log on the
-- same movement and day.
alter table public.lift_logs drop constraint if exists lift_logs_user_id_day_move_key;
create unique index if not exists lift_logs_user_day_move_alive_idx
  on public.lift_logs (user_id, day, move)
  where not deleted;

-- Existing projects created before per-set entries existed.
alter table public.lift_logs
  add column if not exists set_entries jsonb not null default '[]'::jsonb;

create index if not exists lift_logs_user_day_idx
  on public.lift_logs (user_id, day);

create index if not exists lift_logs_user_move_idx
  on public.lift_logs (user_id, move);

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
                     check (priority in ('none', 'low', 'medium', 'high', 'urgent')),
  done             boolean     not null default false,
  completed_at     timestamptz,
  google_event_id  text,
  deleted          boolean     not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists tasks_user_due_idx
  on public.tasks (user_id, due_date);

-- ------------------------------------------------------------ grocery_items --
-- Virtual fridge inventory: where it lives (zone) and what kind of food it is.
-- checked means finished / out; clear soft-deletes those rows.

create table if not exists public.grocery_items (
  id           uuid primary key,
  user_id      uuid        not null references auth.users (id) on delete cascade,
  name         text        not null,
  brand        text,
  quantity     text,
  zone         text        not null default 'fridge'
                 check (zone in ('freezer', 'fridge', 'dairy', 'produce', 'door')),
  kind         text        not null default 'other'
                 check (kind in (
                   'dairy', 'produce', 'meat', 'beverage', 'frozen',
                   'condiment', 'bakery', 'leftover', 'other'
                 )),
  notes        text,
  expires_on   date,
  checked      boolean     not null default false,
  checked_at   timestamptz,
  deleted      boolean     not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists grocery_items_user_zone_idx
  on public.grocery_items (user_id, zone)
  where not deleted;

-- -------------------------------------------------------- calendar_events --

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
-- Household mode: one open policy per table for anon and authenticated.
-- Re-running this file keeps that open policy. It does not require a login.
-- Tables that are not created yet (later add-*.sql files) are skipped.

alter table public.habits     enable row level security;
alter table public.habit_logs enable row level security;
alter table public.goals      enable row level security;
alter table public.identity    enable row level security;
alter table public.day_notes  enable row level security;
alter table public.reviews    enable row level security;
alter table public.nutrition_logs enable row level security;
alter table public.lift_logs  enable row level security;
alter table public.tasks             enable row level security;
alter table public.grocery_items     enable row level security;
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
    'habits', 'habit_logs', 'goals', 'identity', 'day_notes', 'reviews',
    'nutrition_logs', 'lift_logs', 'tasks', 'grocery_items', 'calendar_events',
    'books', 'job_apps', 'finance_accounts', 'finance_entries', 'finance_budgets',
    'life_notes', 'board_cards',
    'daily_nutrition', 'workout_logs', 'watch_entries'
  ] loop
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
      'create policy "household all" on public.%I for all to anon, authenticated using (true) with check (true)',
      t
    );

    execute format(
      'grant select, insert, update, delete on public.%I to anon, authenticated',
      t
    );
  end loop;
end $$;

-- -------------------------------------------------------------- clean-up ----
-- Tombstones only need to outlive the slowest device. Call this by hand, or
-- from a scheduled job, once you have been running for a while:
--   select public.purge_deleted();

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
$$;

-- Hashed ingest key. Anon cannot read or write this table.
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.app_secrets (
  name text primary key,
  value_sha256 text not null
);

alter table public.app_secrets enable row level security;

revoke all on table public.app_secrets from anon, authenticated, public;
grant select on table public.app_secrets to service_role;

insert into public.app_secrets (name, value_sha256)
values ('ingest_key', 'f8ced195526e89adef759390e5404c9ded89eeb5a3fbb239b22c3d22f3d7933e')
on conflict (name) do update set value_sha256 = excluded.value_sha256;

create or replace function public.check_ingest_key(candidate text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  expected text;
  got text;
  diff int := 0;
  i int;
begin
  if candidate is null or length(candidate) = 0 then
    return false;
  end if;

  select value_sha256 into expected
  from public.app_secrets
  where name = 'ingest_key';

  if expected is null or length(expected) = 0 then
    return false;
  end if;

  got := encode(extensions.digest(convert_to(candidate, 'utf8'), 'sha256'), 'hex');
  if length(got) <> length(expected) then
    return false;
  end if;

  for i in 1..length(got) loop
    diff := diff | (ascii(substr(got, i, 1)) # ascii(substr(expected, i, 1)));
  end loop;

  return diff = 0;
end;
$$;

revoke all on function public.check_ingest_key(text) from public;
grant execute on function public.check_ingest_key(text) to anon, authenticated, service_role;

-- Ingest and program writes without a service-role key.
--
-- The API uses the public anon key. These functions run as the owner and
-- refuse every call until check_ingest_key accepts the presented key.
-- They only read and write the household id. They do not delete rows.
-- Safe to re-run.

create or replace function public.program_get(p_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_variable
declare
  owner uuid := 'a1111111-1111-4111-8111-111111111111';
  adopted boolean := false;
  workouts jsonb;
begin
  if not public.check_ingest_key(p_key) then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  select t.adopted into adopted
  from public.training_program t
  where t.user_id = owner;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', w.id,
      'name', w.name,
      'kind', w.kind,
      'days', to_jsonb(w.days),
      'pattern', w.pattern,
      'dates', coalesce((
        select jsonb_agg(to_char(d, 'YYYY-MM-DD'))
        from unnest(w.dates) as d
      ), '[]'::jsonb),
      'startTime', w.start_time,
      'endTime', w.end_time,
      'exercises', w.exercises,
      'sortOrder', w.sort_order,
      'deleted', w.deleted,
      'createdAt', w.created_at,
      'updatedAt', w.updated_at
    )
    order by w.sort_order, w.name
  ), '[]'::jsonb)
  into workouts
  from public.program_workouts w
  where w.user_id = owner;

  return jsonb_build_object(
    'adopted', coalesce(adopted, false),
    'workouts', coalesce(workouts, '[]'::jsonb)
  );
end;
$$;

create or replace function public.program_upsert(
  p_key text,
  p_adopted boolean,
  p_workouts jsonb,
  p_activity jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_variable
declare
  owner uuid := 'a1111111-1111-4111-8111-111111111111';
  item jsonb;
  now_at timestamptz := now();
begin
  if not public.check_ingest_key(p_key) then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if p_workouts is not null then
    if jsonb_typeof(p_workouts) <> 'array' then
      raise exception 'workouts must be a list' using errcode = '22023';
    end if;
    if jsonb_array_length(p_workouts) > 200 then
      raise exception 'Too many workouts.' using errcode = '22023';
    end if;

    insert into public.training_program (user_id, adopted, updated_at)
    values (owner, coalesce(p_adopted, false), now_at)
    on conflict (user_id) do update
      set adopted = excluded.adopted,
          updated_at = excluded.updated_at;

    for item in select value from jsonb_array_elements(p_workouts) as value
    loop
      insert into public.program_workouts (
        id, user_id, name, kind, days, pattern, dates, start_time, end_time,
        exercises, sort_order, deleted, created_at, updated_at
      ) values (
        (item->>'id')::uuid,
        owner,
        coalesce(item->>'name', ''),
        coalesce(item->>'kind', 'strength'),
        coalesce((
          select array_agg(day_value::smallint)
          from jsonb_array_elements_text(coalesce(item->'days', '[]'::jsonb)) as day_value
        ), '{}'::smallint[]),
        coalesce(item->>'pattern', 'weekly'),
        coalesce((
          select array_agg(date_value::date)
          from jsonb_array_elements_text(coalesce(item->'dates', '[]'::jsonb)) as date_value
        ), '{}'::date[]),
        coalesce(item->>'startTime', item->>'start_time', ''),
        coalesce(item->>'endTime', item->>'end_time', ''),
        coalesce(item->'exercises', '[]'::jsonb),
        coalesce((item->>'sortOrder')::integer, (item->>'sort_order')::integer, 0),
        coalesce((item->>'deleted')::boolean, false),
        coalesce(nullif(item->>'createdAt', '')::timestamptz, nullif(item->>'created_at', '')::timestamptz, now_at),
        coalesce(nullif(item->>'updatedAt', '')::timestamptz, nullif(item->>'updated_at', '')::timestamptz, now_at)
      )
      on conflict (id) do update set
        user_id = owner,
        name = excluded.name,
        kind = excluded.kind,
        days = excluded.days,
        pattern = excluded.pattern,
        dates = excluded.dates,
        start_time = excluded.start_time,
        end_time = excluded.end_time,
        exercises = excluded.exercises,
        sort_order = excluded.sort_order,
        deleted = excluded.deleted,
        updated_at = excluded.updated_at
      where public.program_workouts.user_id = owner;
    end loop;
  end if;

  if p_activity is not null then
    insert into public.jeno_activity (id, user_id, kind, action, summary, detail, day, created_at)
    values (
      coalesce(nullif(p_activity->>'id', '')::uuid, gen_random_uuid()),
      owner,
      coalesce(p_activity->>'kind', 'workout'),
      coalesce(p_activity->>'action', 'updated'),
      coalesce(p_activity->>'summary', ''),
      coalesce(p_activity->'detail', '{}'::jsonb),
      nullif(p_activity->>'day', '')::date,
      coalesce(nullif(p_activity->>'createdAt', '')::timestamptz, now_at)
    );
  end if;
end;
$$;

create or replace function public.ingest_nutrition(
  p_key text,
  p_day date,
  p_write jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_variable
declare
  owner uuid := 'a1111111-1111-4111-8111-111111111111';
  existing public.daily_nutrition%rowtype;
  found_row boolean := false;
  now_at timestamptz := now();
  row_id uuid;
  calories numeric;
  protein numeric;
  carbs numeric;
  fat numeric;
  meals jsonb;
  v_habit_id uuid;
  v_log_id uuid;
begin
  if not public.check_ingest_key(p_key) then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  if p_day is null then
    raise exception 'date is required' using errcode = '22023';
  end if;

  select * into existing
  from public.daily_nutrition
  where user_id = owner
    and day = p_day
    and source = 'jeno'
    and deleted = false
  limit 1;
  found_row := found;

  if p_write is null then
    if not found_row then
      return null;
    end if;
    return jsonb_build_object(
      'id', existing.id,
      'calories', existing.calories,
      'protein', existing.protein,
      'carbs', existing.carbs,
      'fat', existing.fat,
      'meals', existing.meals
    );
  end if;

  if jsonb_typeof(p_write) <> 'object' then
    raise exception 'nutrition write must be an object' using errcode = '22023';
  end if;

  calories := coalesce((p_write->>'calories')::numeric, 0);
  protein := coalesce((p_write->>'protein')::numeric, 0);
  carbs := coalesce((p_write->>'carbs')::numeric, 0);
  fat := coalesce((p_write->>'fat')::numeric, 0);
  if calories < 0 or calories > 20000
    or protein < 0 or protein > 20000
    or carbs < 0 or carbs > 20000
    or fat < 0 or fat > 20000 then
    raise exception 'macro out of range' using errcode = '22023';
  end if;

  meals := coalesce(p_write->'meals', '[]'::jsonb);
  if jsonb_typeof(meals) <> 'array' then
    raise exception 'meals must be a list' using errcode = '22023';
  end if;
  if octet_length(meals::text) > 48000 then
    raise exception 'meals is too large' using errcode = '22023';
  end if;

  row_id := coalesce(case when found_row then existing.id else null end, nullif(p_write->>'id', '')::uuid, gen_random_uuid());

  insert into public.daily_nutrition (
    id, user_id, day, source, calories, protein, carbs, fat, meals, deleted, created_at, updated_at
  ) values (
    row_id,
    owner,
    p_day,
    'jeno',
    calories,
    protein,
    carbs,
    fat,
    meals,
    false,
    coalesce(case when found_row then existing.created_at else null end, now_at),
    now_at
  )
  on conflict (id) do update set
    user_id = owner,
    day = excluded.day,
    source = 'jeno',
    calories = excluded.calories,
    protein = excluded.protein,
    carbs = excluded.carbs,
    fat = excluded.fat,
    meals = excluded.meals,
    deleted = false,
    updated_at = excluded.updated_at
  where public.daily_nutrition.user_id = owner
    and public.daily_nutrition.source = 'jeno';

  select h.id into v_habit_id
  from public.habits h
  where h.user_id = owner
    and h.deleted = false
    and h.archived = false
    and h.name ~* 'protein'
  limit 1;

  if v_habit_id is not null then
    select l.id into v_log_id
    from public.habit_logs l
    where l.user_id = owner
      and l.habit_id = v_habit_id
      and l.day = p_day
      and l.deleted = false
    limit 1;
    if v_log_id is not null then
      update public.habit_logs
      set amount = protein, deleted = false, updated_at = now_at
      where id = v_log_id
        and user_id = owner;
    elsif protein > 0 then
      insert into public.habit_logs (id, user_id, habit_id, day, amount, deleted, created_at, updated_at)
      values (gen_random_uuid(), owner, v_habit_id, p_day, protein, false, now_at, now_at);
    end if;
  end if;

  if coalesce(p_write->>'summary', '') <> '' then
    insert into public.jeno_activity (id, user_id, kind, action, summary, detail, day, created_at)
    values (
      gen_random_uuid(),
      owner,
      'nutrition',
      'logged',
      p_write->>'summary',
      coalesce(p_write->'detail', '{}'::jsonb),
      p_day,
      now_at
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'kind', 'nutrition',
    'day', to_char(p_day, 'YYYY-MM-DD'),
    'calories', calories,
    'protein', protein,
    'carbs', carbs,
    'fat', fat,
    'meals', meals,
    'proteinHabitId', v_habit_id
  );
end;
$$;

create or replace function public.ingest_workout(
  p_key text,
  p_day date,
  p_plan_id text,
  p_done boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_variable
declare
  owner uuid := 'a1111111-1111-4111-8111-111111111111';
  existing_id uuid;
  now_at timestamptz := now();
  row_id uuid;
begin
  if not public.check_ingest_key(p_key) then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  if p_day is null then
    raise exception 'date is required' using errcode = '22023';
  end if;

  select id into existing_id
  from public.workout_logs
  where user_id = owner and day = p_day and deleted = false
  limit 1;

  row_id := coalesce(existing_id, gen_random_uuid());
  insert into public.workout_logs (id, user_id, day, plan_id, done, deleted, created_at, updated_at)
  values (row_id, owner, p_day, coalesce(p_plan_id, ''), coalesce(p_done, true), false, now_at, now_at)
  on conflict (id) do update set
    plan_id = excluded.plan_id,
    done = excluded.done,
    deleted = false,
    updated_at = excluded.updated_at
  where public.workout_logs.user_id = owner;

  return jsonb_build_object(
    'ok', true,
    'kind', 'workout',
    'day', to_char(p_day, 'YYYY-MM-DD'),
    'planId', coalesce(p_plan_id, ''),
    'done', coalesce(p_done, true)
  );
end;
$$;

revoke all on function public.program_get(text) from public;
revoke all on function public.program_upsert(text, boolean, jsonb, jsonb) from public;
revoke all on function public.ingest_nutrition(text, date, jsonb) from public;
revoke all on function public.ingest_workout(text, date, text, boolean) from public;

grant execute on function public.program_get(text) to anon, authenticated, service_role;
grant execute on function public.program_upsert(text, boolean, jsonb, jsonb) to anon, authenticated, service_role;
grant execute on function public.ingest_nutrition(text, date, jsonb) to anon, authenticated, service_role;
grant execute on function public.ingest_workout(text, date, text, boolean) to anon, authenticated, service_role;

notify pgrst, 'reload schema';
