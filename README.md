# Tally

A habit and goal tracker. Same stack as `bible-year-plan` — Vite + React + Supabase + Vercel.

Six habits ship as the starting set: whole foods, walk after meals, lift, sleep, protein, weigh in.
Edit or delete any of them on the Habits tab.

Training sessions prescribe the next load and reps from what you logged last time
(reps-first once a barbell hits 135 lb or dumbbells hit 15 lb). Lift performance
syncs like nutrition once the `lift_logs` table from [`supabase/schema.sql`](supabase/schema.sql)
is present.

## How habits are tracked

Not everything is a checkbox, so a habit picks one of four kinds:

| Kind | What it means | Example |
| --- | --- | --- |
| `check` | Done or not, one tap | Whole foods |
| `count` | Tap once per rep, up to a target | 3 walks, 2 lifts |
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

It works with no configuration at all — everything saves to `localStorage`, no account needed.
Supabase adds sign-in and cross-device sync on top of that; it is not required.

## Turning on sync

1. Create a project at [supabase.com](https://supabase.com).
2. In the dashboard, open **SQL Editor → New query**, paste all of [`supabase/schema.sql`](supabase/schema.sql), and run it.
   That creates the habit, goal, nutrition, and lift-log tables with row-level security, so each
   account can only ever read or write its own rows.
3. Copy `.env.example` to `.env.local` and fill in the project URL and publishable (anon) key from
   **Project Settings → API**.
4. Restart `npm run dev`, then use **Sign in → Create account** in the app.

Whatever is already on the device merges into the account on first sign-in — nothing is replaced.

## Deploying to Vercel

```bash
npx vercel
```

Then add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under **Project Settings → Environment
Variables** and redeploy. Both are safe to expose in the browser: the anon key is public by design,
and row-level security is what actually protects the data.

`vercel.json` rewrites all routes to `index.html`.

## How sync works

Local-first. `localStorage` is the immediate source of truth, so checking a box never waits on the
network and the whole app works offline. When signed in, `DataProvider` merges with Supabase on
sign-in and pushes changed records on a debounce.

Two details make that safe on more than one device:

- **Client-generated ids.** A habit created offline already has its final uuid, so pushing it later
  is a plain upsert with nothing to reconcile.
- **Soft deletes.** Removing something writes `deleted = true` rather than issuing a `DELETE`. A
  hard delete on one device is invisible to another that is offline, and the row would come back on
  its next push; a tombstone is a normal edit that wins on recency. `purge_deleted()` in the schema
  clears out old ones.

Conflicts resolve last-write-wins per record, which suits data that is small, independent, and
edited by one person.
