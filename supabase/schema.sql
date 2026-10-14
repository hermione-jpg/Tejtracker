-- Personal Tracker schema
-- Run this once in the Supabase SQL editor (or via `supabase db push`).
--
-- SECURITY MODEL
-- This app has no login. The browser never talks to Supabase directly and
-- never holds the Supabase anon or service-role key. All reads/writes go
-- through Vercel serverless functions (/api/*) which use the SERVICE ROLE
-- key (server-side only) and are themselves gated by a single shared
-- passcode (APP_ACCESS_TOKEN). Because of that, Row Level Security is
-- turned ON for every table with NO policies at all -- this blocks every
-- request that uses the anon/public key (i.e. anything from a browser that
-- somehow got the anon key) while the service-role key used by the API
-- routes bypasses RLS entirely, as it always does in Supabase. This is the
-- standard "service-role-only" pattern for single-user apps without auth.

create extension if not exists "uuid-ossp";

create table if not exists goals (
  id uuid primary key default uuid_generate_v4(),
  domain text not null check (domain in ('personal','professional')),
  title text not null,
  description text,
  target_date date,
  status text not null default 'active' check (status in ('active','paused','done','dropped')),
  progress_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists projects (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  goal_id uuid references goals(id) on delete set null,
  status text not null default 'active' check (status in ('active','paused','done','dropped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key default uuid_generate_v4(),
  domain text not null check (domain in ('personal','professional')),
  title text not null,
  status text not null default 'open' check (status in ('open','in_progress','done','dropped')),
  priority smallint not null default 2 check (priority between 1 and 3), -- 1=high 2=med 3=low
  planned_date date, -- the day it's a "today" priority for
  due_date date,
  goal_id uuid references goals(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  category text, -- used for professional work categories
  notes text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists time_entries (
  id uuid primary key default uuid_generate_v4(),
  domain text not null check (domain in ('personal','professional')),
  activity text not null,
  category text, -- e.g. design/technology/writing/research/coordination/meetings/learning (professional)
  entry_date date not null,
  duration_seconds integer not null check (duration_seconds >= 0),
  started_at timestamptz,
  ended_at timestamptz,
  project_id uuid references projects(id) on delete set null,
  goal_id uuid references goals(id) on delete set null,
  task_id uuid references tasks(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists notes (
  id uuid primary key default uuid_generate_v4(),
  domain text not null check (domain in ('personal','professional')),
  kind text not null default 'note' check (kind in ('note','learning','reflection','idea')),
  title text,
  content text not null,
  project_id uuid references projects(id) on delete set null,
  goal_id uuid references goals(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists routines (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  frequency text not null default 'daily' check (frequency in ('daily','weekly')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists routine_logs (
  id uuid primary key default uuid_generate_v4(),
  routine_id uuid not null references routines(id) on delete cascade,
  log_date date not null,
  done boolean not null default true,
  created_at timestamptz not null default now(),
  unique(routine_id, log_date)
);

create table if not exists daily_reflections (
  id uuid primary key default uuid_generate_v4(),
  reflection_date date not null unique,
  accomplishments text,
  learnings text,
  continue_tomorrow text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Singleton row that holds the live start/stop timer so it survives
-- refreshes and works across devices/tabs.
create table if not exists timer_state (
  id smallint primary key default 1 check (id = 1),
  is_running boolean not null default false,
  started_at timestamptz,
  domain text check (domain in ('personal','professional')),
  activity text,
  category text,
  project_id uuid references projects(id) on delete set null,
  goal_id uuid references goals(id) on delete set null,
  task_id uuid references tasks(id) on delete set null,
  notes text,
  updated_at timestamptz not null default now()
);
insert into timer_state (id, is_running) values (1, false)
  on conflict (id) do nothing;

-- Indexes for the lookups the app actually does
create index if not exists idx_tasks_domain_planned on tasks(domain, planned_date);
create index if not exists idx_tasks_goal on tasks(goal_id);
create index if not exists idx_tasks_project on tasks(project_id);
create index if not exists idx_time_entries_date on time_entries(entry_date);
create index if not exists idx_time_entries_domain_date on time_entries(domain, entry_date);
create index if not exists idx_time_entries_category on time_entries(category);
create index if not exists idx_notes_domain on notes(domain, created_at desc);
create index if not exists idx_goals_domain on goals(domain, status);
create index if not exists idx_routine_logs_date on routine_logs(log_date);

-- Lock every table down: RLS on, zero policies. Only the service-role key
-- (used exclusively by the /api serverless functions) can read or write.
alter table goals enable row level security;
alter table projects enable row level security;
alter table tasks enable row level security;
alter table time_entries enable row level security;
alter table notes enable row level security;
alter table routines enable row level security;
alter table routine_logs enable row level security;
alter table daily_reflections enable row level security;
alter table timer_state enable row level security;
