-- Tally — personal household mode (no logins)
-- One shared owner for every device. Safe to re-run.
--
-- 1) Seeds a fixed auth.users row so user_id foreign keys still work.
-- 2) Opens RLS for the anon + authenticated roles so the public anon key
--    can sync without a JWT session.
--
-- This is intentional for a single-person / household app. Anyone with the
-- deployed URL can read and write the same data.

-- ----------------------------------------------------------- household user --

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  is_sso_user,
  is_anonymous
) values (
  '00000000-0000-0000-0000-000000000000',
  'a1111111-1111-4111-8111-111111111111',
  'authenticated',
  'authenticated',
  'household@tally.app',
  crypt('not-used-for-login', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"username":"household"}'::jsonb,
  false,
  '',
  '',
  '',
  '',
  false,
  false
)
on conflict (id) do nothing;

insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  'a1111111-1111-4111-8111-111111111111',
  'a1111111-1111-4111-8111-111111111111',
  jsonb_build_object(
    'sub', 'a1111111-1111-4111-8111-111111111111',
    'email', 'household@tally.app',
    'email_verified', true
  ),
  'email',
  'a1111111-1111-4111-8111-111111111111',
  now(),
  now(),
  now()
where not exists (
  select 1 from auth.identities
  where user_id = 'a1111111-1111-4111-8111-111111111111'
    and provider = 'email'
);

-- -------------------------------------------------------------- open RLS ----

do $$
declare
  t text;
  tables text[] := array[
    'habits', 'habit_logs', 'goals', 'identity', 'day_notes', 'reviews',
    'nutrition_logs', 'lift_logs',
    'tasks', 'calendar_events', 'books', 'job_apps',
    'finance_accounts', 'finance_entries', 'finance_budgets',
    'grocery_items', 'life_notes', 'board_cards'
  ];
begin
  foreach t in array tables loop
    if to_regclass(format('public.%I', t)) is null then
      continue;
    end if;

    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists "own rows read"   on public.%I', t);
    execute format('drop policy if exists "own rows insert" on public.%I', t);
    execute format('drop policy if exists "own rows update" on public.%I', t);
    execute format('drop policy if exists "own rows delete" on public.%I', t);
    execute format('drop policy if exists "household all"   on public.%I', t);
    execute format('drop policy if exists "household read"  on public.%I', t);
    execute format('drop policy if exists "household write" on public.%I', t);

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
