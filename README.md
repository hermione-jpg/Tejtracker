# Personal Tracker

A single-user app for tracking personal and professional goals, tasks, time, and
learning, with a daily workflow and history/insights. React + TypeScript + Vite,
Supabase for storage, Vercel for hosting, installable as a PWA.

## How it's secured (no login)

There's no auth system, but your data is not public. The browser never talks to
Supabase directly and never sees the Supabase anon or service-role key. Every
read/write goes through serverless functions in `/api`, which:

1. Check `Authorization: Bearer <APP_ACCESS_TOKEN>` against an env var you set.
2. Use the Supabase **service-role** key (server-side only) to do the actual
   query.

The database itself has Row Level Security turned on for every table with
**zero policies** -- so even if the anon key ever leaked, it could not read or
write anything. Only the service-role key (used exclusively inside `/api`) can
touch the data, and that key never leaves Vercel's servers.

The frontend asks for the passcode once, on first load, and caches it in
`localStorage`. If the server ever rejects it (wrong token, or you change it),
the app drops back to the passcode screen.

**This is appropriate for a private single-user tool, not for multi-user auth.**
Use a long random passcode (see `.env.example`), not a 4-digit PIN.

## 1. Run it locally

```bash
npm install
npm run dev
```

This starts the Vite dev server (frontend only). The `/api` functions need
Vercel's dev runtime to work locally:

```bash
npm install -g vercel
vercel dev
```

`vercel dev` reads env vars from `.env` (copy `.env.example` to `.env` and fill
it in) and runs both the frontend and the `/api/*` functions together.

## 2. Set up Supabase

1. Create a free project at supabase.com.
2. Open the SQL editor and run everything in `supabase/schema.sql`. This
   creates all tables, indexes, and locks RLS down as described above.
3. From Project Settings -> API, copy:
   - **Project URL** -> `SUPABASE_URL`
   - **service_role key** (not the anon key) -> `SUPABASE_SERVICE_ROLE_KEY`
4. Generate a passcode: `openssl rand -hex 24` -> `APP_ACCESS_TOKEN`

## 3. Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Then, in the Vercel project's dashboard -> Settings -> Environment Variables,
add `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `APP_ACCESS_TOKEN` (same
values as your `.env`). Redeploy after adding them (`vercel --prod`).

Do **not** prefix these with `VITE_` -- that prefix tells Vite to inline the
value into the browser bundle, which would defeat the whole point.

## 4. Install as a PWA

Once deployed, open the Vercel URL on your phone or laptop:

- **Android/Chrome/Edge (desktop or mobile):** an "Install app" prompt appears
  in the address bar or browser menu.
- **iOS Safari:** Share -> "Add to Home Screen."

The app shell (HTML/CSS/JS) is cached for offline *loading*, but all actual
data goes through `/api` to Supabase, which needs a connection. Opening the
app offline shows the installed shell, not your data -- there's no offline
editing/sync in this version.

## What's implemented

- Today / Personal / Professional / History & Insights / Settings screens
- Goals, projects, tasks (with priority, planned date, links to goals/projects)
- A start/stop timer stored in the database (survives refresh and works across
  devices, since it's not just in browser memory), plus manual time entry
- Learning notes, ideas, and reflections, with search
- Optional daily reflections and optional daily/weekly routines
- Charts (time by category, daily/weekly pattern, time invested per goal), all
  clickable to drill into the underlying records -- nothing is a static mockup
- JSON export and import (import is idempotent: it upserts by id, so
  re-importing the same file never duplicates data)
- CSV export is **not yet implemented** -- only JSON export/import exists today.
  Flagging this honestly rather than leaving a dead button: if you want it,
  it's a straightforward addition to `src/pages/Settings.tsx` and `api/export.ts`.

## Honest limitations

- I built and type-checked this project and confirmed the production build
  serves correctly (HTML/JS/CSS/manifest/icons all load), but I do **not**
  have network access to Supabase from the environment I built this in, so
  the `/api` functions have been carefully reviewed but not exercised against
  a live database. Run through the "Test it" checklist below once your
  Supabase project is connected, and tell me what breaks.
- No automated test suite -- this is a personal tool, tested manually.
- The JS bundle is ~200KB gzipped (recharts is the biggest contributor). Fine
  for personal use; if it ever bothers you, lazy-loading the History page's
  charts would be the first optimization.

## Test it once Supabase is connected

- [ ] Create/edit/delete a goal, project, task, note
- [ ] Start a timer, refresh the page, confirm it's still running and the
      elapsed time is correct, then stop it and confirm a time entry appears
- [ ] Log a manual time entry
- [ ] Mark a task done/undone
- [ ] Add a daily reflection, reload, confirm it persists
- [ ] Toggle a routine for today
- [ ] Switch date on Today and confirm tasks/time scope to that day
- [ ] Search notes on History
- [ ] Export data, then import that same file back in -- confirm no duplicates
- [ ] Resize to a phone width and confirm layout holds up
- [ ] `npm run build` in production mode and smoke-test the built output
