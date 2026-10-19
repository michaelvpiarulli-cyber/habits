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
The shipped build points at the Habits project, so opening it asks you to sign in. Until you do, nothing in that database is readable from the app.

## Private sync

One owner. Email and password, the same form in the browser and in the Capacitor iPhone app.

Magic links were the other option. They need a redirect back into the app, and on iOS that link opens in Safari unless you add a custom URL scheme or universal links. Password sign-in stays inside the WKWebView, and the session is kept in localStorage, which both the site and the iOS wrapper already persist. You sign in once per device.

The publishable key in the client only identifies the project. It cannot read rows. The Life OS ingest endpoint uses the **service role** key on the server, reads `public.life_os_owner_id()` (which looks up `private.app_owner`), and sets `user_id` itself. Do not put the service role key in Vite or in the iOS app.

### What you do in Supabase

Project: `amrqzdnsbgoqkckcytjq` (the Habits project). Do this before you rely on the new app. The SQL does not delete rows.

1. **Create your account before the lock script.** On the Tally sign-in screen, choose **Create account** and use the email and password you want. This project confirms email automatically, so you are signed in immediately. You can instead use **Authentication → Users → Add user** with **Auto Confirm User** on. Do this before step 4. Existing rows are not deleted.
2. Turn **off** “Allow new users to sign up” (Authentication → Sign In / Providers, or Authentication → Settings). The SQL also rejects sign-ups that are not on an allowlist.
3. **Authentication → URL Configuration.** Set Site URL to `https://habits-silk-six.vercel.app`. Add `http://localhost:5173` if you use the dev server. Password sign-in does not need a redirect; this is for the project URL itself.
4. **SQL Editor → New query.** Paste [`supabase/lock-owner-rls.sql`](supabase/lock-owner-rls.sql) and run it. Safe to re-run. It drops the public policies, bans the old shared household login (its password was in the repo), and does not move or delete your data.
5. Edit [`supabase/backfill-owner.sql`](supabase/backfill-owner.sql): replace `REPLACE_WITH_YOUR_EMAIL` with the same email, keep the quotes, and run the whole file. It reassigns rows whose `user_id` is empty or still the old household id (`a1111111-1111-4111-8111-111111111111`). It does not change `updated_at` and does not delete. The SQL editor prints how many rows moved. Running it again for the same email is safe. A different email is refused once an owner is recorded.
6. Open the site or the iPhone app and sign in. If Settings still mentions the backfill, the SQL step did not finish — run it, then **Sync now**.

Create the user in step 1 **before** step 4. The lock script installs a trigger that blocks new accounts. If you already ran the lock and still need to create the user:

```sql
insert into private.allowed_emails (email) values ('you@example.com');
```

Then add the user, then run the backfill.

Leave the old household user in Authentication. Deleting it before you have signed in and seen your data can cascade-delete any row still pointing at it. The lock script already bans that login.

### Fresh database

1. Create a project at [supabase.com](https://supabase.com).
2. Run [`supabase/schema.sql`](supabase/schema.sql), then any later `supabase/add-*.sql` files you need. Do **not** run `add-household-open.sql` — that file now refuses to run. It used to open the database to the anon key.
3. Follow the steps above (create the user, run the lock, run the backfill). The backfill is a no-op on an empty database except it records you as the owner, which is what allows sync.

Optional: copy `.env.example` to `.env.local` to override the shipped Supabase URL and publishable key. Restart `npm run dev`.

## Deploying to Vercel

```bash
npx vercel --prod
```

The app ships Supabase defaults for the Habits project. Production still needs the
sign-in and the SQL in **Private sync** above — the publishable key alone can no
longer read or write rows.
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

Sign in with the same email and password inside the iPhone app. That session stays on the phone; it is not the browser session.

App Store submission is a separate step (paid developer account, screenshots, review). You do not need that to use Tally yourself.

## Life OS

Home is the daily dashboard: habits due today, food against 2,100 kcal and 210 g protein, today’s workout and the next one, today’s calendar, and the latest watch-log entries. The full habit tracker is still on **Habits**. Bottom nav on a phone is Home and Plan.

### Food, workouts, and the watch log

In the Supabase SQL editor, run [`supabase/add-life-os.sql`](supabase/add-life-os.sql). If you already ran `lock-owner-rls.sql` before this file, run the lock script once more so the new tables are in the owner policy loop. The file is safe to re-run and does not delete rows.

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

`date` may also be sent as `day`. A workout post on Sunday is rejected. Omit `done` and it is recorded as done. Until `backfill-owner.sql` has recorded an owner, ingest returns 409.

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
only copy and the app does not ask you to sign in. When it is configured, a signed-out launch shows
the sign-in screen; after sign-in, `DataProvider` merges with Supabase and pushes changed records
on a debounce. Until `supabase/backfill-owner.sql` has recorded your user, sync stays paused so
existing rows are not duplicated under new ids.

Two details make that safe on more than one device:

- **Client-generated ids.** A habit created offline already has its final uuid, so pushing it later
  is a plain upsert with nothing to reconcile.
- **Soft deletes.** Removing something writes `deleted = true` rather than issuing a `DELETE`. A
  hard delete on one device is invisible to another that is offline, and the row would come back on
  its next push; a tombstone is a normal edit that wins on recency. `purge_deleted()` in the schema
  clears out old ones.

Conflicts resolve last-write-wins per record, which suits data that is small, independent, and
edited by one person.
