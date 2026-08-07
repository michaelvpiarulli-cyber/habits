-- Fix: create missing nutrition_logs + lift_logs (safe to re-run)
-- Supabase → SQL Editor → New query → paste all → Run
-- Then in the app: Account → Sync now

-- ---------------------------------------------------------- nutrition_logs --
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

alter table public.nutrition_logs
  add column if not exists meals jsonb not null default '[]'::jsonb;

create index if not exists nutrition_logs_user_day_idx
  on public.nutrition_logs (user_id, day);

-- --------------------------------------------------------------- lift_logs --
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

alter table public.lift_logs drop constraint if exists lift_logs_user_id_day_move_key;
create unique index if not exists lift_logs_user_day_move_alive_idx
  on public.lift_logs (user_id, day, move)
  where not deleted;

alter table public.lift_logs
  add column if not exists set_entries jsonb not null default '[]'::jsonb;

create index if not exists lift_logs_user_day_idx
  on public.lift_logs (user_id, day);

create index if not exists lift_logs_user_move_idx
  on public.lift_logs (user_id, move);

-- ------------------------------------------------------------------ RLS ----
alter table public.nutrition_logs enable row level security;
alter table public.lift_logs  enable row level security;

do $$
declare t text;
begin
  foreach t in array array['nutrition_logs', 'lift_logs'] loop
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
