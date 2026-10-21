-- Ingest and program writes without a service-role key.
--
-- The API uses the public anon key. These functions run as the owner and
-- refuse every call until check_ingest_key accepts the presented key.
-- They only read and write the household id. They do not delete rows.
-- Safe to re-run.

create or replace function public.program_get(p_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_variable
declare
  owner uuid := 'a1111111-1111-4111-8111-111111111111';
  adopted boolean := false;
  workouts jsonb;
begin
  if not public.check_ingest_key(p_key) then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  select t.adopted into adopted
  from public.training_program t
  where t.user_id = owner;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', w.id,
      'name', w.name,
      'kind', w.kind,
      'days', to_jsonb(w.days),
      'pattern', w.pattern,
      'dates', coalesce((
        select jsonb_agg(to_char(d, 'YYYY-MM-DD'))
        from unnest(w.dates) as d
      ), '[]'::jsonb),
      'startTime', w.start_time,
      'endTime', w.end_time,
      'exercises', w.exercises,
      'sortOrder', w.sort_order,
      'deleted', w.deleted,
      'createdAt', w.created_at,
      'updatedAt', w.updated_at
    )
    order by w.sort_order, w.name
  ), '[]'::jsonb)
  into workouts
  from public.program_workouts w
  where w.user_id = owner;

  return jsonb_build_object(
    'adopted', coalesce(adopted, false),
    'workouts', coalesce(workouts, '[]'::jsonb)
  );
end;
$$;

create or replace function public.program_upsert(
  p_key text,
  p_adopted boolean,
  p_workouts jsonb,
  p_activity jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_variable
declare
  owner uuid := 'a1111111-1111-4111-8111-111111111111';
  item jsonb;
  now_at timestamptz := now();
begin
  if not public.check_ingest_key(p_key) then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if p_workouts is not null then
    if jsonb_typeof(p_workouts) <> 'array' then
      raise exception 'workouts must be a list' using errcode = '22023';
    end if;
    if jsonb_array_length(p_workouts) > 200 then
      raise exception 'Too many workouts.' using errcode = '22023';
    end if;

    insert into public.training_program (user_id, adopted, updated_at)
    values (owner, coalesce(p_adopted, false), now_at)
    on conflict (user_id) do update
      set adopted = excluded.adopted,
          updated_at = excluded.updated_at;

    for item in select value from jsonb_array_elements(p_workouts) as value
    loop
      insert into public.program_workouts (
        id, user_id, name, kind, days, pattern, dates, start_time, end_time,
        exercises, sort_order, deleted, created_at, updated_at
      ) values (
        (item->>'id')::uuid,
        owner,
        coalesce(item->>'name', ''),
        coalesce(item->>'kind', 'strength'),
        coalesce((
          select array_agg(day_value::smallint)
          from jsonb_array_elements_text(coalesce(item->'days', '[]'::jsonb)) as day_value
        ), '{}'::smallint[]),
        coalesce(item->>'pattern', 'weekly'),
        coalesce((
          select array_agg(date_value::date)
          from jsonb_array_elements_text(coalesce(item->'dates', '[]'::jsonb)) as date_value
        ), '{}'::date[]),
        coalesce(item->>'startTime', item->>'start_time', ''),
        coalesce(item->>'endTime', item->>'end_time', ''),
        coalesce(item->'exercises', '[]'::jsonb),
        coalesce((item->>'sortOrder')::integer, (item->>'sort_order')::integer, 0),
        coalesce((item->>'deleted')::boolean, false),
        coalesce(nullif(item->>'createdAt', '')::timestamptz, nullif(item->>'created_at', '')::timestamptz, now_at),
        coalesce(nullif(item->>'updatedAt', '')::timestamptz, nullif(item->>'updated_at', '')::timestamptz, now_at)
      )
      on conflict (id) do update set
        user_id = owner,
        name = excluded.name,
        kind = excluded.kind,
        days = excluded.days,
        pattern = excluded.pattern,
        dates = excluded.dates,
        start_time = excluded.start_time,
        end_time = excluded.end_time,
        exercises = excluded.exercises,
        sort_order = excluded.sort_order,
        deleted = excluded.deleted,
        updated_at = excluded.updated_at
      where public.program_workouts.user_id = owner;
    end loop;
  end if;

  if p_activity is not null then
    insert into public.jeno_activity (id, user_id, kind, action, summary, detail, day, created_at)
    values (
      coalesce(nullif(p_activity->>'id', '')::uuid, gen_random_uuid()),
      owner,
      coalesce(p_activity->>'kind', 'workout'),
      coalesce(p_activity->>'action', 'updated'),
      coalesce(p_activity->>'summary', ''),
      coalesce(p_activity->'detail', '{}'::jsonb),
      nullif(p_activity->>'day', '')::date,
      coalesce(nullif(p_activity->>'createdAt', '')::timestamptz, now_at)
    );
  end if;
end;
$$;

create or replace function public.ingest_nutrition(
  p_key text,
  p_day date,
  p_write jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_variable
declare
  owner uuid := 'a1111111-1111-4111-8111-111111111111';
  existing public.daily_nutrition%rowtype;
  found_row boolean := false;
  now_at timestamptz := now();
  row_id uuid;
  calories numeric;
  protein numeric;
  carbs numeric;
  fat numeric;
  meals jsonb;
  v_habit_id uuid;
  v_log_id uuid;
begin
  if not public.check_ingest_key(p_key) then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  if p_day is null then
    raise exception 'date is required' using errcode = '22023';
  end if;

  select * into existing
  from public.daily_nutrition
  where user_id = owner
    and day = p_day
    and source = 'jeno'
    and deleted = false
  limit 1;
  found_row := found;

  if p_write is null then
    if not found_row then
      return null;
    end if;
    return jsonb_build_object(
      'id', existing.id,
      'calories', existing.calories,
      'protein', existing.protein,
      'carbs', existing.carbs,
      'fat', existing.fat,
      'meals', existing.meals
    );
  end if;

  if jsonb_typeof(p_write) <> 'object' then
    raise exception 'nutrition write must be an object' using errcode = '22023';
  end if;

  calories := coalesce((p_write->>'calories')::numeric, 0);
  protein := coalesce((p_write->>'protein')::numeric, 0);
  carbs := coalesce((p_write->>'carbs')::numeric, 0);
  fat := coalesce((p_write->>'fat')::numeric, 0);
  if calories < 0 or calories > 20000
    or protein < 0 or protein > 20000
    or carbs < 0 or carbs > 20000
    or fat < 0 or fat > 20000 then
    raise exception 'macro out of range' using errcode = '22023';
  end if;

  meals := coalesce(p_write->'meals', '[]'::jsonb);
  if jsonb_typeof(meals) <> 'array' then
    raise exception 'meals must be a list' using errcode = '22023';
  end if;
  if octet_length(meals::text) > 48000 then
    raise exception 'meals is too large' using errcode = '22023';
  end if;

  row_id := coalesce(case when found_row then existing.id else null end, nullif(p_write->>'id', '')::uuid, gen_random_uuid());

  insert into public.daily_nutrition (
    id, user_id, day, source, calories, protein, carbs, fat, meals, deleted, created_at, updated_at
  ) values (
    row_id,
    owner,
    p_day,
    'jeno',
    calories,
    protein,
    carbs,
    fat,
    meals,
    false,
    coalesce(case when found_row then existing.created_at else null end, now_at),
    now_at
  )
  on conflict (id) do update set
    user_id = owner,
    day = excluded.day,
    source = 'jeno',
    calories = excluded.calories,
    protein = excluded.protein,
    carbs = excluded.carbs,
    fat = excluded.fat,
    meals = excluded.meals,
    deleted = false,
    updated_at = excluded.updated_at
  where public.daily_nutrition.user_id = owner
    and public.daily_nutrition.source = 'jeno';

  select h.id into v_habit_id
  from public.habits h
  where h.user_id = owner
    and h.deleted = false
    and h.archived = false
    and h.name ~* 'protein'
  limit 1;

  if v_habit_id is not null then
    select l.id into v_log_id
    from public.habit_logs l
    where l.user_id = owner
      and l.habit_id = v_habit_id
      and l.day = p_day
      and l.deleted = false
    limit 1;
    if v_log_id is not null then
      update public.habit_logs
      set amount = protein, deleted = false, updated_at = now_at
      where id = v_log_id
        and user_id = owner;
    elsif protein > 0 then
      insert into public.habit_logs (id, user_id, habit_id, day, amount, deleted, created_at, updated_at)
      values (gen_random_uuid(), owner, v_habit_id, p_day, protein, false, now_at, now_at);
    end if;
  end if;

  if coalesce(p_write->>'summary', '') <> '' then
    insert into public.jeno_activity (id, user_id, kind, action, summary, detail, day, created_at)
    values (
      gen_random_uuid(),
      owner,
      'nutrition',
      'logged',
      p_write->>'summary',
      coalesce(p_write->'detail', '{}'::jsonb),
      p_day,
      now_at
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'kind', 'nutrition',
    'day', to_char(p_day, 'YYYY-MM-DD'),
    'calories', calories,
    'protein', protein,
    'carbs', carbs,
    'fat', fat,
    'meals', meals,
    'proteinHabitId', v_habit_id
  );
end;
$$;

create or replace function public.ingest_workout(
  p_key text,
  p_day date,
  p_plan_id text,
  p_done boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_variable
declare
  owner uuid := 'a1111111-1111-4111-8111-111111111111';
  existing_id uuid;
  now_at timestamptz := now();
  row_id uuid;
begin
  if not public.check_ingest_key(p_key) then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  if p_day is null then
    raise exception 'date is required' using errcode = '22023';
  end if;

  select id into existing_id
  from public.workout_logs
  where user_id = owner and day = p_day and deleted = false
  limit 1;

  row_id := coalesce(existing_id, gen_random_uuid());
  insert into public.workout_logs (id, user_id, day, plan_id, done, deleted, created_at, updated_at)
  values (row_id, owner, p_day, coalesce(p_plan_id, ''), coalesce(p_done, true), false, now_at, now_at)
  on conflict (id) do update set
    plan_id = excluded.plan_id,
    done = excluded.done,
    deleted = false,
    updated_at = excluded.updated_at
  where public.workout_logs.user_id = owner;

  return jsonb_build_object(
    'ok', true,
    'kind', 'workout',
    'day', to_char(p_day, 'YYYY-MM-DD'),
    'planId', coalesce(p_plan_id, ''),
    'done', coalesce(p_done, true)
  );
end;
$$;

revoke all on function public.program_get(text) from public;
revoke all on function public.program_upsert(text, boolean, jsonb, jsonb) from public;
revoke all on function public.ingest_nutrition(text, date, jsonb) from public;
revoke all on function public.ingest_workout(text, date, text, boolean) from public;

grant execute on function public.program_get(text) to anon, authenticated, service_role;
grant execute on function public.program_upsert(text, boolean, jsonb, jsonb) to anon, authenticated, service_role;
grant execute on function public.ingest_nutrition(text, date, jsonb) to anon, authenticated, service_role;
grant execute on function public.ingest_workout(text, date, text, boolean) to anon, authenticated, service_role;

notify pgrst, 'reload schema';
