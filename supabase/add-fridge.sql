-- Tally — virtual fridge columns on grocery_items
-- Run after add-grocery.sql (or a fresh schema.sql). Safe to re-run.
--
-- Turns the shopping-list shaped table into fridge inventory: zone (where),
-- kind (food type), brand, and optional use-by date.

alter table public.grocery_items add column if not exists brand text;
alter table public.grocery_items add column if not exists kind text;
alter table public.grocery_items add column if not exists expires_on date;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'grocery_items' and column_name = 'aisle'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'grocery_items' and column_name = 'zone'
  ) then
    alter table public.grocery_items rename column aisle to zone;
  end if;
end $$;

alter table public.grocery_items add column if not exists zone text;

update public.grocery_items
set zone = case
  when zone in ('freezer', 'fridge', 'dairy', 'produce', 'door') then zone
  when zone = 'frozen' then 'freezer'
  when zone = 'beverages' then 'fridge'
  when zone in ('produce', 'dairy') then zone
  else 'fridge'
end
where zone is null
   or zone not in ('freezer', 'fridge', 'dairy', 'produce', 'door');

update public.grocery_items
set kind = coalesce(nullif(kind, ''), 'other')
where kind is null or kind = '';

update public.grocery_items
set kind = case
  when kind in (
    'dairy', 'produce', 'meat', 'beverage', 'frozen',
    'condiment', 'bakery', 'leftover', 'other'
  ) then kind
  else 'other'
end;

alter table public.grocery_items alter column zone set default 'fridge';
alter table public.grocery_items alter column kind set default 'other';
alter table public.grocery_items alter column zone set not null;
alter table public.grocery_items alter column kind set not null;

alter table public.grocery_items drop constraint if exists grocery_items_aisle_check;
alter table public.grocery_items drop constraint if exists grocery_items_zone_check;
alter table public.grocery_items drop constraint if exists grocery_items_kind_check;

alter table public.grocery_items
  add constraint grocery_items_zone_check
  check (zone in ('freezer', 'fridge', 'dairy', 'produce', 'door'));

alter table public.grocery_items
  add constraint grocery_items_kind_check
  check (kind in (
    'dairy', 'produce', 'meat', 'beverage', 'frozen',
    'condiment', 'bakery', 'leftover', 'other'
  ));

drop index if exists grocery_items_user_aisle_idx;
create index if not exists grocery_items_user_zone_idx
  on public.grocery_items (user_id, zone)
  where not deleted;
