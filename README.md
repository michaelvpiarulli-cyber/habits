# Tally

A habit tracker with a Notion-quiet shell — Vite + React + Supabase + Vercel / Railway.

**Habits** is the home dashboard: what’s due today, keep the chain, close a perfect day.
**Planning** is the rest — pages, boards/tables, todos, books, and calendar — opened from a
retractable sidebar (Notion-like). Extra tools (calories, fridge, money, etc.) stay folded
under **More** in the sidebar.

Five habits ship as the starting set: whole foods, walk after meals, sleep, protein, weigh in.
Edit them from the sidebar → **Edit habits**.

Food is logged under sidebar **More → Calories**. Day totals still roll up for the Protein habit.
**Fridge** is a virtual fridge under the same More fold.

## How habits are tracked

Not everything is a checkbox, so a habit picks one of four kinds:

| Kind | What it means | Example |
| --- | --- | --- |
| `check` | Done or not, one tap | Whole foods |
| `count` | Tap once per rep, up to a target | 3 walks |
| `amount` | Enter the number you hit against a target | 8 h sleep, 185 g protein |
| `measure` | Record a reading and watch the trend | Weigh in |

A day only counts as done once it reaches the target — two of three walks is recorded and shown as
a partly inked square, but it does not prop up a streak. A `measure` habit is the exception: any
reading counts, because the habit is stepping on the scale, not what the scale says.

Streaks skip days a habit was never due, and today never counts against you until it is over.

## Running it

```bash
npm install && npm run dev
```

It works with no Supabase configuration at all — everything saves to `localStorage` and there is no sign-in screen.
The shipped build points at the Habits project and opens straight to the Life OS dashboard. Sync uses the shared household id and the public anon key. There is no login.

## Household sync

No sign-in. Every device reads and writes the same Supabase project as the household user `a1111111-1111-4111-8111-111111111111`. Row-level security is enabled and opened to `anon` and `authenticated` (`using (true)`).

The publishable key in the client identifies the project and is enough to sync. The Life OS ingest endpoint still requires `TALLY_INGEST_KEY` and writes under that same household id. It does not look up an owner. Do not put the service role key in Vite or in the iOS app.

Habits, goals, tasks, notes, and the rest already sync. Food totals, workout completions, and the watch log need the new tables: run [`supabase/add-life-os.sql`](supabase/add-life-os.sql) once in the SQL editor. It is safe to re-run and does not delete rows.

[`supabase/lock-owner-rls.sql`](supabase/lock-owner-rls.sql) and [`supabase/backfill-owner.sql`](supabase/backfill-owner.sql) are optional leftovers from a login experiment. Do not run them. They would close the open policies and move rows onto a signed-in user.

### Fresh database

1. Create a project at [supabase.com](https://supabase.com).
2. Run [`supabase/schema.sql`](supabase/schema.sql). It creates the original tables and opens them to the anon key.
3. Run [`supabase/add-household-open.sql`](supabase/add-household-open.sql) so the household user exists for the `user_id` foreign keys. The password it stores is random and unused.
4. Run the later `supabase/add-*.sql` files you need, including [`supabase/add-life-os.sql`](supabase/add-life-os.sql).

Optional: copy `.env.example` to `.env.local` to override the shipped Supabase URL and publishable key. Restart `npm run dev`.

## Deploying to Vercel

```bash
npx vercel --prod
```

The app ships Supabase defaults for the Habits project. Production opens the
dashboard with no sign-in. Existing household tables sync with the publishable
key. New Life OS tables sync after `supabase/add-life-os.sql`.
Optionally set `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (or `VITE_GOOGLE_CLIENT_ID`) under
**Project Settings → Environment Variables** and redeploy. Never set the Supabase
service-role key as a `VITE_` variable.

`vercel.json` sends `/api/*` to the serverless functions and every other route to `index.html`.

## iPhone app

Two ways, both from the same codebase.

### On your phone today (Home Screen)

1. Open the live site in **Safari** (not Chrome).
2. Tap **Share → Add to Home Screen → Add**.
3. Open Tally from the new icon. It runs full-screen, with the Tally icon.

Account → iPhone in the app repeats those steps when you are still in Safari.

### Native install from Xcode (no App Store)

This is the real iPhone app: Taptic haptics, status bar, home-screen icon from Xcode. You need a Mac with Xcode. A free Apple ID is enough to put it on your own phone for a week at a time.

```bash
npm install
npm run ios
npm run ios:open
```

In Xcode:

1. Select the **App** target → **Signing & Capabilities**.
2. Check **Automatically manage signing** and pick your Personal Team.
3. Plug in your iPhone, pick it as the run destination, press Play.

After you change the web app:

```bash
npm run ios
```

then Run again in Xcode. `ios/` is the Capacitor shell; `npx cap sync` copies `dist/` into it.

The iPhone app uses the same household database. There is no separate sign-in.

App Store submission is a separate step (paid developer account, screenshots, review). You do not need that to use Tally yourself.

## Life OS

Home is the daily dashboard: habits due today, food against 2,100 kcal and 210 g protein, today’s workout and the next one, today’s calendar, and the latest watch-log entries. The full habit tracker is still on **Habits**. Bottom nav on a phone is Home and Plan.

### Food, workouts, and the watch log

In the Supabase SQL editor, run [`supabase/add-life-os.sql`](supabase/add-life-os.sql). That is the only SQL the new tables need. It creates `daily_nutrition`, `workout_logs`, and `watch_entries` and opens each one with a `household all` policy for `anon` and `authenticated`. The file is safe to re-run and does not delete rows.

`daily_nutrition` stores one total per day (`day`, calories, protein, carbs, fat, meals JSON). The in-app meal diary (`nutrition_logs`, the Calories page) stays. The dashboard shows whichever of the two was updated later. Protein grams are copied onto the existing Protein habit when that total is newer than the habit log. The habit’s own target is unchanged (the starter is 185 g). 210 g is the dashboard goal, so a day at 210 g still completes the habit.

Workouts follow a fixed week. Monday, Wednesday, and Friday alternate Strength A (squat, bench, cable row, RDL, plank) and Strength B (RDL, DB shoulder press, lat pulldown, split squat, curls, pushdowns), starting Strength A on Monday 1 Jan 2024. Tuesday, Thursday, and Saturday are a walk from 7:00 to 8:00 AM. Sunday is rest. Mark a day done on Home or Workouts.

Watch log is under More → Watch log: title, link, date watched, 1–5 stars, notes, edit, and delete.

### Ingest endpoint

`POST /api/ingest` lets another assistant write a daily food total or mark a workout done. On Vercel, set these **server** environment variables (never `VITE_`):

- `TALLY_INGEST_KEY` — a long random secret
- `SUPABASE_SERVICE_ROLE_KEY` — Project Settings → API → service_role
- `SUPABASE_URL` — optional, defaults to `https://amrqzdnsbgoqkckcytjq.supabase.co`

Send the secret as `Authorization: Bearer <TALLY_INGEST_KEY>` or `x-tally-ingest-key`. The function ignores any `user_id` in the body.

```bash
curl -X POST https://habits-silk-six.vercel.app/api/ingest \
  -H "Authorization: Bearer $TALLY_INGEST_KEY" \
  -H "Content-Type: application/json" \
  -d '{"kind":"nutrition","date":"2026-10-19","calories":1800,"protein":160,"carbs":180,"fat":55,"meals":[{"name":"Lunch","calories":700,"protein":45}]}'

curl -X POST https://habits-silk-six.vercel.app/api/ingest \
  -H "Authorization: Bearer $TALLY_INGEST_KEY" \
  -H "Content-Type: application/json" \
  -d '{"kind":"workout","date":"2026-10-19","done":true}'
```

`date` may also be sent as `day`. A workout post on Sunday is rejected. Omit `done` and it is recorded as done. Rows are stored under the household id. A missing owner record is not an error. A missing or wrong `TALLY_INGEST_KEY` still returns 503 or 401. The new tables must exist (`add-life-os.sql`) or the write fails.

## Google Calendar and Gmail

Optional. The app keeps its own tasks, events, and due dates without Google. Home reads **today’s events** from the primary calendar once Google is connected.

The shipped OAuth client id is the Tally web client. Override it with `VITE_GOOGLE_CLIENT_ID` if you create your own.

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials) open the OAuth 2.0 **Web application** client (or create one).
2. Authorized JavaScript origins: `http://localhost:5173` and `https://habits-silk-six.vercel.app`.
3. Enable **Google Calendar API** and **Gmail API**.
4. OAuth consent screen: add yourself as a test user while the app is in testing. Scopes used: `calendar.events` (read and write events) and `gmail.readonly` (inbox, and the address of the connected account).
5. In Tally: **Settings → Connect Google**, and choose **michaelvpiarulli@gmail.com**. Home reads that account’s primary calendar. If another Google account is connected, Home says so.

There is no server-side Google refresh token. The GIS token lives in this browser tab only, so Calendar on the dashboard is read-only for the signed-in Google user and asks you to connect again when the token expires.

## How sync works

Local-first. `localStorage` is the immediate source of truth, so checking a box never waits on the
network and the whole app works offline. When Supabase is not configured, that local cache is the
only copy and the app does not ask you to sign in. When it is configured, the app opens the
dashboard immediately and `DataProvider` merges with Supabase under the household id, then pushes
changed records on a debounce. Sync does not wait for a login or a backfill.

Two details make that safe on more than one device:

- **Client-generated ids.** A habit created offline already has its final uuid, so pushing it later
  is a plain upsert with nothing to reconcile.
- **Soft deletes.** Removing something writes `deleted = true` rather than issuing a `DELETE`. A
  hard delete on one device is invisible to another that is offline, and the row would come back on
  its next push; a tombstone is a normal edit that wins on recency. `purge_deleted()` in the schema
  clears out old ones.

Conflicts resolve last-write-wins per record, which suits data that is small, independent, and
edited by one person.
