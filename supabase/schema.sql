-- Tally — habit + goal tracker
-- Run this once in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Safe to re-run: every statement is guarded.
--
-- Every table is keyed to auth.users and protected by row-level
-- security, so a signed-in user can only ever touch their own rows.
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
-- One macro total per day. This stays separate from habits because calories,
-- carbs, and fat are observations, not four more daily pass/fail obligations.

create table if not exists public.nutrition_logs (
  id         uuid primary key,
  user_id    uuid        not null references auth.users (id) on delete cascade,
  day        date        not null,
  calories   numeric     not null default 0 check (calories >= 0),
  protein    numeric     not null default 0 check (protein >= 0),
  carbs      numeric     not null default 0 check (carbs >= 0),
  fat        numeric     not null default 0 check (fat >= 0),
  deleted    boolean     not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, day)
);

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
  updated_at  timestamptz not null default now(),
  unique (user_id, day, move)
);

-- Existing projects created before per-set entries existed.
alter table public.lift_logs
  add column if not exists set_entries jsonb not null default '[]'::jsonb;

create index if not exists lift_logs_user_day_idx
  on public.lift_logs (user_id, day);

create index if not exists lift_logs_user_move_idx
  on public.lift_logs (user_id, move);

-- ------------------------------------------------------------------ RLS ----
-- Identical shape on every table: you may only read or write rows whose
-- user_id is your own. The `with check` on insert/update is what stops a client
-- from writing a row that claims to belong to someone else.

alter table public.habits     enable row level security;
alter table public.habit_logs enable row level security;
alter table public.goals      enable row level security;
alter table public.identity    enable row level security;
alter table public.day_notes  enable row level security;
alter table public.reviews    enable row level security;
alter table public.nutrition_logs enable row level security;
alter table public.lift_logs  enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'habits', 'habit_logs', 'goals', 'identity', 'day_notes', 'reviews',
    'nutrition_logs', 'lift_logs'
  ] loop
    execute format('drop policy if exists "own rows read"   on public.%I', t);
    execute format('drop policy if exists "own rows insert" on public.%I', t);
    execute format('drop policy if exists "own rows update" on public.%I', t);
    execute format('drop policy if exists "own rows delete" on public.%I', t);

    execute format(
      'create policy "own rows read" on public.%I for select using (auth.uid() = user_id)', t);
    execute format(
      'create policy "own rows insert" on public.%I for insert with check (auth.uid() = user_id)', t);
    execute format(
      'create policy "own rows update" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
    execute format(
      'create policy "own rows delete" on public.%I for delete using (auth.uid() = user_id)', t);
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
$$;
