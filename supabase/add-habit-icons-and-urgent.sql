-- Additive only. Existing emoji values and task priorities stay as they are.
-- icon and color are optional display keys. Null means the app infers an icon
-- and uses the default tint. emoji is kept and is no longer shown.

alter table public.habits add column if not exists icon text;
alter table public.habits add column if not exists color text;

do $$
declare
  rec record;
begin
  for rec in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'tasks'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%priority%'
  loop
    execute format('alter table public.tasks drop constraint %I', rec.conname);
  end loop;

  alter table public.tasks
    add constraint tasks_priority_check
    check (priority in ('none', 'low', 'medium', 'high', 'urgent'));
end $$;

notify pgrst, 'reload schema';
