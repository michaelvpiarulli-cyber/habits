-- Public MyFitnessPal diary sync.
--
-- Safe to re-run. Does not delete food rows.
-- daily_nutrition.source separates JENO ingest ('jeno') from diary sync ('mfp')
-- so a re-sync replaces only the MyFitnessPal row for that day.

alter table public.daily_nutrition
  add column if not exists source text not null default 'jeno';

update public.daily_nutrition
  set source = 'jeno'
  where source is null or source = '';

drop index if exists public.daily_nutrition_user_day_alive_idx;
create unique index if not exists daily_nutrition_user_day_source_alive_idx
  on public.daily_nutrition (user_id, day, source)
  where not deleted;

create table if not exists public.mfp_sync (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  username       text        not null default '',
  last_synced_at timestamptz,
  last_status    text        not null default '',
  last_error     text        not null default '',
  backfill_done  boolean     not null default false,
  updated_at     timestamptz not null default now()
);

alter table public.mfp_sync enable row level security;
drop policy if exists "household all" on public.mfp_sync;
create policy "household all" on public.mfp_sync
  for all to anon, authenticated using (true) with check (true);
grant select, insert, update, delete on public.mfp_sync to anon, authenticated;

notify pgrst, 'reload schema';
