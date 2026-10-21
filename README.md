# Tally

Tally is Michael’s life operating system. One calm place for the day: calendar, food, training, scripture, habits, and the short list of tasks, notes, and goals he is carrying.

It is not a habit tracker with side tools. Habits are one module. JENO, his assistant, writes food and the training program. Michael reads those screens. He does not log sets.

Vite, React, Supabase, and Vercel. No login. The open household project and its existing tables stay. New tables are additive.

## Screens

- **Today** — a glance: today’s session, food against 2,100 kcal and 210 g protein, the Bible reading, habits, the top 3 tasks, and the next calendar event.
- **Food** — meals and the MyFitnessPal sync.
- **Workouts** — the program and the day’s session.
- **Habits** — habits only.
- **Plan** — calendar and tasks.
- **Bible** — M’Cheyne Bible in a year (1842, public domain). Check passages, see progress, catch up missed days. 29 February is a catch-up day.
- **Watch** — the watch log (title, link, 1–5 rating, notes).
- **Notes** — pages and docs in the sidebar.
- **JENO** — activity log of food entries and workout changes.
- **Settings** — MyFitnessPal username, sync, and connections.

Bottom tabs on a phone: Today, Food, Workouts, Plan. The rest sit under More.

## What stayed, what left the screens

Kept, and still synced: habits, goals, tasks, notes, day notes, books, calendar events, `daily_nutrition`, `workout_logs`, `watch_entries`, and the household id `a1111111-1111-4111-8111-111111111111`.

Left off the screens (rows are not deleted): mail, jobs, money, fridge, boards, rewards, and the old calorie diary. Food on screen is the ingested day, including each food JENO sends.

## Running it

```bash
npm install && npm run dev
```

With no Supabase keys the app keeps working on this device. The shipped build uses the household project and the public anon key. There is no sign-in screen.

Do not run `supabase/lock-owner-rls.sql` or `supabase/backfill-owner.sql`.

For the JENO program, inbox, and Bible checkmarks, run [`supabase/add-jeno-program.sql`](supabase/add-jeno-program.sql) once in the SQL editor. It is safe to re-run and does not delete rows. Until that file is applied, the app shows the seeded program and Bible checks stay on the device.

Food, workout-done rows, and the watch log already use [`supabase/add-life-os.sql`](supabase/add-life-os.sql).

Pages and blocks use [`supabase/add-pages.sql`](supabase/add-pages.sql). It is safe to re-run and does not change older tables. Until it is applied, new pages stay on this device.

## JENO

Both routes use the server secret `TALLY_INGEST_KEY` (`Authorization: Bearer` or `x-tally-ingest-key`). Set these on Vercel, never as `VITE_` variables:

- `TALLY_INGEST_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_URL` (optional, defaults to `https://amrqzdnsbgoqkckcytjq.supabase.co`)

`BASE` is the deployment that contains this API (preview or production). The function ignores `user_id` and writes as the household.

### Food

`POST /api/ingest` with `kind: nutrition`.

A totals-only post replaces the calories, protein, carbs, and fat you send for that day. A second post for the same day replaces those numbers and does not add to them. Fields you leave out keep the previous values. Foods already stored for that day stay in the row. The screens show only the daily total.

Per-food entries use `entries` (or `foods`). Each item is `name`, `calories`, `protein`, `carbs`, `fat`, and `meal`. Omit the day totals and Tally sums the foods. `mode: "append"` adds to that day. Any other post that includes entries replaces that day’s foods so a full MyFitnessPal snapshot stays exact.

```bash
curl -X POST "$BASE/api/ingest" \
  -H "Authorization: Bearer $TALLY_INGEST_KEY" \
  -H "Content-Type: application/json" \
  -d '{"kind":"nutrition","date":"2026-10-19","calories":1800,"protein":160,"carbs":180,"fat":55}'

curl -X POST "$BASE/api/ingest" \
  -H "Authorization: Bearer $TALLY_INGEST_KEY" \
  -H "Content-Type: application/json" \
  -d '{"kind":"nutrition","date":"2026-10-19","entries":[{"meal":"Breakfast","name":"Eggs","calories":140,"protein":12,"carbs":1,"fat":10},{"meal":"Lunch","name":"Chicken breast","calories":280,"protein":52,"carbs":0,"fat":6}]}'

curl -X POST "$BASE/api/ingest" \
  -H "Authorization: Bearer $TALLY_INGEST_KEY" \
  -H "Content-Type: application/json" \
  -d '{"kind":"nutrition","date":"2026-10-19","mode":"append","entries":[{"meal":"Dinner","name":"Salmon","calories":350,"protein":34,"carbs":0,"fat":20}]}'
```

Meals can also nest foods:

```bash
curl -X POST "$BASE/api/ingest" \
  -H "Authorization: Bearer $TALLY_INGEST_KEY" \
  -H "Content-Type: application/json" \
  -d '{"kind":"nutrition","date":"2026-10-19","meals":[{"name":"Breakfast","foods":[{"name":"Eggs","calories":140,"protein":12,"carbs":1,"fat":10}]}]}'
```

`date` may be sent as `day`. Protein is still copied onto the Protein habit. 210 g is the dashboard goal. The habit keeps its own target.

Tally can also read a public MyFitnessPal diary. Set the username in Settings. Leave it blank until Michael sends it. The screen says: Add your MyFitnessPal username and set your diary to public. `MFP_USERNAME` overrides that field when it is set on the server. `GET /api/mfp-sync` runs once a day at 15:00 UTC (about 8:00 am Pacific). Hobby cron cannot run every 30 minutes, so Sync now is the immediate pull. Each run covers today and yesterday in America/Los_Angeles, and the first run backfills 14 days. Those rows use `daily_nutrition.source = mfp` and replace themselves on the next sync. JENO rows stay `source = jeno`.

The older `kind: workout` body still marks that calendar day’s completion row. It does not edit the program. Sunday is rejected.

```bash
curl -X POST "$BASE/api/ingest" \
  -H "Authorization: Bearer $TALLY_INGEST_KEY" \
  -H "Content-Type: application/json" \
  -d '{"kind":"workout","date":"2026-10-19","done":true}'
```

### Workouts

`/api/program` is the weekly program. Until JENO writes, `GET` returns the seed:

- **Strength A** alternates onto Mon/Wed/Fri (squat, bench, cable row, RDL, plank). Sets and reps are placeholders.
- **Strength B** takes the other Mon/Wed/Fri (RDL, DB shoulder press, lat pulldown, split squat, curls, pushdowns).
- **Walk** is Tue/Thu/Sat, 7:00–8:00 AM.

The first create, update, or delete copies that seed into the database and then applies the change, so JENO can patch Strength A by the id from `GET`. `PUT` replaces the whole program and drops the seed.

Days are `Mon`…`Sun` or `0`…`6` (Monday is 0). `kind` is `strength`, `walk`, `cardio`, or `other`. `pattern` is `weekly` (default), `alternate-a`, or `alternate-b`. Optional `dates` is a list of `YYYY-MM-DD` days that show the workout in addition to that weekly pattern. Exercises stay in array order: `name`, `sets`, `reps`, `weight`, `notes`, `rest`.

```bash
curl "$BASE/api/program" \
  -H "Authorization: Bearer $TALLY_INGEST_KEY"

curl -X POST "$BASE/api/program" \
  -H "Authorization: Bearer $TALLY_INGEST_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"Easy cardio","kind":"cardio","days":["Sun"],"exercises":[{"name":"Bike","sets":1,"reps":"20 min","notes":"flat"}]}'

curl -X PATCH "$BASE/api/program" \
  -H "Authorization: Bearer $TALLY_INGEST_KEY" \
  -H "Content-Type: application/json" \
  -d '{"id":"11111111-1111-4111-8111-1111111111a1","exercises":[{"name":"Squat","sets":5,"reps":"5","weight":"185 lb","rest":"3 min"}]}'

curl -X DELETE "$BASE/api/program?id=11111111-1111-4111-8111-1111111111c3" \
  -H "Authorization: Bearer $TALLY_INGEST_KEY"

curl -X PUT "$BASE/api/program" \
  -H "Authorization: Bearer $TALLY_INGEST_KEY" \
  -H "Content-Type: application/json" \
  -d '{"workouts":[{"name":"Full body","days":["Mon","Thu"],"exercises":[{"name":"Squat","sets":3,"reps":"5","weight":"200 lb","rest":"2 min"}]}]}'
```

A wrong key returns 401. `TALLY_INGEST_KEY` still works when it is set. When it is unset, the server accepts the key whose SHA-256 matches `app_secrets` name `ingest_key`. Run `add-jeno-program.sql` before the first write.

Each food post and each program change is also written to `jeno_activity`, which the JENO tab lists.

## Google Calendar

Settings → Connect Google, as `michaelvpiarulli@gmail.com`. Today and Plan read that account’s primary calendar. The token lives in the browser tab. If another Google account is connected, the screen says so.

Authorized JavaScript origins need `http://localhost:5173` and the Vercel host. Enable the Google Calendar API. The shipped client id can be overridden with `VITE_GOOGLE_CLIENT_ID`.

## Deploying

`vercel.json` sends `/api/*` to the serverless functions and every other route to `index.html`. A preview deploy from a pull request is the right place to try this rebuild. Do not promote it to production until Michael says so.

Never set the service-role key as a `VITE_` variable.
