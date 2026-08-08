-- Habits project is missing core sync tables (nutrition_logs / lift_logs already exist).
-- Supabase → project amrqzdnsbgoqkckcytjq → SQL Editor → New query → paste all → Run

create table if not exists public.habits (
  id          uuid primary key,
  user_id     uuid        not null references auth.users (id) on delete cascade,
  name        text        not null,
  emoji       text,
  cadence     text        not null default 'daily'
                check (cadence in ('daily', 'weekdays', 'per_week')),
  weekdays    smallint[]  not null default '{}',
  per_week    smallint    not null default 3 check (per_week between 1 and 7),
  kind        text        not null default 'check'
                check (kind in ('check', 'count', 'amount', 'measure')),
  target      numeric     check (target is null or target > 0),
  unit        text,
  floor       numeric     check (floor is null or floor > 0),
  identity_id uuid,
  cue         text,
  after_id    uuid        references public.habits (id) on delete set null,
  archived    boolean     not null default false,
  sort_order  integer     not null default 0,
  deleted     boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint habits_target_required
    check (kind not in ('count', 'amount') or target is not null)
);

alter table public.habits
  add column if not exists floor     numeric,
  add column if not exists identity_id uuid,
  add column if not exists cue       text,
  add column if not exists after_id  uuid references public.habits (id) on delete set null;

create index if not exists habits_user_idx on public.habits (user_id);

create table if not exists public.habit_logs (
  id         uuid primary key,
  user_id    uuid        not null references auth.users (id) on delete cascade,
  habit_id   uuid        not null references public.habits (id) on delete cascade,
  day        date        not null,
  amount     numeric,
  note       text,
  deleted    boolean     not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.habit_logs drop constraint if exists habit_logs_habit_id_day_key;
create unique index if not exists habit_logs_habit_day_alive_idx
  on public.habit_logs (habit_id, day)
  where not deleted;

create index if not exists habit_logs_user_day_idx on public.habit_logs (user_id, day);

create table if not exists public.goals (
  id         uuid primary key,
  user_id    uuid        not null references auth.users (id) on delete cascade,
  title      text        not null,
  detail     text,
  target     numeric     not null default 1 check (target > 0),
  progress   numeric     not null default 0,
  unit       text,
  habit_id   uuid        references public.habits (id) on delete set null,
  due_date   date,
  done       boolean     not null default false,
  deleted    boolean     not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists goals_user_idx on public.goals (user_id);

create table if not exists public.identity (
  id         uuid primary key,
  user_id    uuid        not null references auth.users (id) on delete cascade,
  name       text        not null,
  note       text,
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

create table if not exists public.reviews (
  id          uuid primary key,
  user_id     uuid        not null references auth.users (id) on delete cascade,
  week_start  date        not null,
  held        text        not null default '',
  compromised text        not null default '',
  focus       text        not null default '',
  scores      jsonb       not null default '{}'::jsonb,
  deleted     boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, week_start)
);

create index if not exists reviews_user_week_idx on public.reviews (user_id, week_start);

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

grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;
notify pgrst, 'reload schema';
