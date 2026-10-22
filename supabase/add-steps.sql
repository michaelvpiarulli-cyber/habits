-- Daily step counts from an iPhone Shortcut, plus a steps-only key.
--
-- Safe to re-run. Does not delete rows. The raw steps key is never stored.
-- app_secrets keeps only the SHA-256, same as ingest_key. The steps key is
-- accepted only by ingest_steps. The food and workout key cannot write steps,
-- and the steps key cannot write food or workouts.
--
-- A count of 10,000 or more checks the 10,000 steps habit for that day.
-- A lower count replaces the stored number and leaves any manual check alone.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.daily_steps (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users (id) on delete cascade,
  day        date        not null,
  steps      integer     not null check (steps >= 0 and steps <= 200000),
  deleted    boolean     not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, day)
);

create index if not exists daily_steps_user_day_idx
  on public.daily_steps (user_id, day);

alter table public.daily_steps enable row level security;

drop policy if exists "household all" on public.daily_steps;
create policy "household all" on public.daily_steps
  for all to anon, authenticated
  using (true) with check (true);

grant select, insert, update, delete on public.daily_steps to anon, authenticated, service_role;

create or replace function public.check_steps_key(candidate text)
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
  where name = 'steps_key';

  if expected is null or length(expected) <> 64 then
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

create or replace function public.steps_key_ready()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_secrets
    where name = 'steps_key'
      and value_sha256 is not null
      and length(value_sha256) = 64
  );
$$;

create or replace function public.reveal_steps_key()
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  raw text;
  hashed text;
begin
  raw := encode(extensions.gen_random_bytes(24), 'hex');
  hashed := encode(extensions.digest(convert_to(raw, 'utf8'), 'sha256'), 'hex');
  insert into public.app_secrets (name, value_sha256)
  values ('steps_key', hashed)
  on conflict (name) do update set value_sha256 = excluded.value_sha256;
  return raw;
end;
$$;

create or replace function public.ingest_steps(
  p_key text,
  p_day date,
  p_steps integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
#variable_conflict use_variable
declare
  owner uuid := 'a1111111-1111-4111-8111-111111111111';
  steps_habit uuid := '7a110000-0000-4000-8000-000000000011';
  now_at timestamptz := now();
  row_id uuid;
  log_id uuid;
  log_deleted boolean;
  checked boolean := false;
  habit_ok boolean := false;
begin
  if not public.check_steps_key(p_key) then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  if p_day is null then
    raise exception 'date is required' using errcode = '22023';
  end if;
  if p_steps is null or p_steps < 0 or p_steps > 200000 then
    raise exception 'steps must be from 0 to 200000' using errcode = '22023';
  end if;

  insert into public.daily_steps (user_id, day, steps, deleted, created_at, updated_at)
  values (owner, p_day, p_steps, false, now_at, now_at)
  on conflict (user_id, day) do update set
    steps = excluded.steps,
    deleted = false,
    updated_at = excluded.updated_at
  returning id into row_id;

  select exists (
    select 1
    from public.habits
    where id = steps_habit
      and user_id = owner
      and deleted = false
      and archived = false
  ) into habit_ok;

  if habit_ok and p_steps >= 10000 then
    select id, deleted into log_id, log_deleted
    from public.habit_logs
    where user_id = owner
      and habit_id = steps_habit
      and day = p_day
    order by deleted asc, updated_at desc
    limit 1;

    if log_id is null then
      insert into public.habit_logs (
        id, user_id, habit_id, day, amount, deleted, created_at, updated_at
      ) values (
        extensions.gen_random_uuid(), owner, steps_habit, p_day, null, false, now_at, now_at
      );
    elsif log_deleted then
      update public.habit_logs
      set deleted = false, amount = null, updated_at = now_at
      where id = log_id
        and user_id = owner;
    end if;
    checked := true;
  elsif habit_ok then
    select exists (
      select 1
      from public.habit_logs
      where user_id = owner
        and habit_id = steps_habit
        and day = p_day
        and deleted = false
    ) into checked;
  end if;

  return jsonb_build_object(
    'ok', true,
    'kind', 'steps',
    'day', to_char(p_day, 'YYYY-MM-DD'),
    'steps', p_steps,
    'checked', checked
  );
end;
$$;

revoke all on function public.check_steps_key(text) from public;
revoke all on function public.steps_key_ready() from public;
revoke all on function public.reveal_steps_key() from public;
revoke all on function public.ingest_steps(text, date, integer) from public;

grant execute on function public.check_steps_key(text) to anon, authenticated, service_role;
grant execute on function public.steps_key_ready() to anon, authenticated, service_role;
grant execute on function public.reveal_steps_key() to anon, authenticated, service_role;
grant execute on function public.ingest_steps(text, date, integer) to anon, authenticated, service_role;

notify pgrst, 'reload schema';
