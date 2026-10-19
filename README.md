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

The publishable key in the client only identifies the project. It cannot read rows. A later ingest endpoint (food totals, workouts) should use the **service role** key on the server, read `private.app_owner`, and set `user_id` to that id itself. Do not put the service role key in Vite or in the iOS app. This repo does not add that endpoint yet.

### What you do in Supabase

Project: `amrqzdnsbgoqkckcytjq` (the Habits project). Do this before you rely on the new app. The SQL does not delete rows.

1. **Authentication → Users → Add user.** Use your email and a password you will type into Tally. Turn on **Auto Confirm User**.
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

`vercel.json` rewrites all routes to `index.html`.

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

## Google Calendar and Gmail

Optional. The app keeps its own tasks, events, and due dates without Google.

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials) create an
   OAuth 2.0 **Web application** client.
2. Add authorized JavaScript origins for `http://localhost:5173` and your Vercel URL.
3. Enable **Google Calendar API** and **Gmail API**.
4. Put the client id in `VITE_GOOGLE_CLIENT_ID` (and the same key on Vercel).
5. In the app: **Account → Connect Google**, or the same button on Calendar / Mail.

Connecting asks for calendar.events (so a due date can be written onto your calendar) and
gmail.readonly (so Mail can list the inbox). Tokens stay in this browser tab only.

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
