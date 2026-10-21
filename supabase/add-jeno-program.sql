-- JENO program, inbox, and Bible checkmarks.
--
-- Safe to re-run. Does not delete or move existing rows.
-- Run once in the Supabase SQL editor for the household project.
-- The app still shows the seeded Strength A/B plan until this exists and
-- JENO writes the first workout.

-- -------------------------------------------------------- program_workouts --

create table if not exists public.program_workouts (
  id          uuid primary key,
  user_id     uuid        not null references auth.users (id) on delete cascade,
  name        text        not null,
  kind        text        not null default 'strength'
                check (kind in ('strength', 'walk', 'cardio', 'other')),
  days        smallint[]  not null default '{}',
  pattern     text        not null default 'weekly'
                check (pattern in ('weekly', 'alternate-a', 'alternate-b')),
  dates       date[]      not null default '{}',
  start_time  text        not null default '',
  end_time    text        not null default '',
  exercises   jsonb       not null default '[]'::jsonb,
  sort_order  integer     not null default 0,
  deleted     boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists program_workouts_user_idx
  on public.program_workouts (user_id);

-- Extra calendar days (one-offs) on top of the weekly pattern.
alter table public.program_workouts
  add column if not exists dates date[] not null default '{}';

-- ------------------------------------------------------- training_program --
-- One row per household. adopted flips true the first time JENO writes,
-- so an empty program stays empty instead of falling back to the seed.

create table if not exists public.training_program (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  adopted    boolean     not null default false,
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------- jeno_activity --

create table if not exists public.jeno_activity (
  id         uuid primary key,
  user_id    uuid        not null references auth.users (id) on delete cascade,
  kind       text        not null,
  action     text        not null,
  summary    text        not null,
  detail     jsonb       not null default '{}'::jsonb,
  day        date,
  created_at timestamptz not null default now()
);

create index if not exists jeno_activity_user_created_idx
  on public.jeno_activity (user_id, created_at desc);

-- ------------------------------------------------------------ bible_checks --

create table if not exists public.bible_checks (
  id         uuid primary key,
  user_id    uuid        not null references auth.users (id) on delete cascade,
  year       smallint    not null,
  day_index  smallint    not null check (day_index between 0 and 364),
  slots      smallint[]  not null default '{}',
  deleted    boolean     not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists bible_checks_user_day_alive_idx
  on public.bible_checks (user_id, year, day_index)
  where not deleted;

-- ------------------------------------------------------------------ RLS ----

do $$
declare
  t text;
  tables text[] := array['program_workouts', 'training_program', 'jeno_activity', 'bible_checks'];
begin
  foreach t in array tables loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "household all" on public.%I', t);
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

notify pgrst, 'reload schema';
