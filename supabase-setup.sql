-- Action Tracker — Supabase setup.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> Run.

create table if not exists public.tracker_state (
  id         text primary key,
  rev        bigint      not null default 0,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Row Level Security is ON with no policies, so the table is unreachable from
-- the browser with a publishable/anon key. Only the server-side secret key
-- (which bypasses RLS) can read or write it — and /api/state already requires
-- a signed-in session before it will touch this table.
alter table public.tracker_state enable row level security;

-- Seed the single row the tracker uses.
insert into public.tracker_state (id, rev, data)
values ('main', 0, '{}'::jsonb)
on conflict (id) do nothing;
