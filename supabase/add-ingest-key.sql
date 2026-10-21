-- Hashed ingest key. The raw key is not stored. Anon cannot read or write the table.
-- check_ingest_key lets the API compare a presented key when no service role is configured.

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

notify pgrst, 'reload schema';
