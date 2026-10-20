-- Notebook pages and blocks.
--
-- Safe to re-run. Does not change existing tables or delete rows.
-- Open household model: the anon key can read and write, same as the rest
-- of this project. There is no login.

-- ------------------------------------------------------------------ pages --

create table if not exists public.pages (
  id          uuid primary key,
  user_id     uuid        not null references auth.users (id) on delete cascade,
  parent_id   uuid        references public.pages (id) on delete cascade,
  title       text        not null default 'Untitled',
  icon        text        not null default '',
  cover       text        not null default '',
  favorite    boolean     not null default false,
  system_key  text,
  position    integer     not null default 0,
  props       jsonb       not null default '{}'::jsonb,
  deleted     boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index if not exists pages_user_system_alive_idx
  on public.pages (user_id, system_key)
  where system_key is not null and not deleted;

create index if not exists pages_user_idx
  on public.pages (user_id);

create index if not exists pages_parent_idx
  on public.pages (parent_id);

-- ----------------------------------------------------------------- blocks --

create table if not exists public.blocks (
  id         uuid primary key,
  user_id    uuid        not null references auth.users (id) on delete cascade,
  page_id    uuid        not null references public.pages (id) on delete cascade,
  type       text        not null default 'text',
  content    text        not null default '',
  checked    boolean     not null default false,
  props      jsonb       not null default '{}'::jsonb,
  position   integer     not null default 0,
  deleted    boolean     not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists blocks_user_idx
  on public.blocks (user_id);

create index if not exists blocks_page_position_idx
  on public.blocks (page_id, position);

-- -------------------------------------------------------------------- RLS --

do $$
declare
  t text;
  tables text[] := array['pages', 'blocks'];
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

alter table public.pages add column if not exists props jsonb not null default '{}'::jsonb;

do $$
declare
  r record;
begin
  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.blocks'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%type%'
  loop
    execute format('alter table public.blocks drop constraint %I', r.conname);
  end loop;
end $$;

notify pgrst, 'reload schema';
