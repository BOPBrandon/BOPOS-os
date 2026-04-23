-- ============================================================
-- BOPOS Custom Tools — Database Schema
-- Paste and run this in your Supabase SQL Editor.
-- ============================================================


-- ── TABLE: bop_custom_tools ──────────────────────────────────
-- Stores AI-generated tools deployed from The Workbench.
-- RLS ensures users can only see and manage their own tools.

create table if not exists public.bop_custom_tools (
  id              uuid        default gen_random_uuid() primary key,
  created_at      timestamptz default now()             not null,
  user_id         uuid        references auth.users(id) on delete cascade not null,
  tool_name       text                                   not null,
  code_content    text                                   not null,
  target_location text        check (target_location in ('mpr', 'os', 'anchor')) not null
);

-- Row Level Security
alter table public.bop_custom_tools enable row level security;

create policy "Users manage own tools"
  on public.bop_custom_tools
  for all
  using     (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Fast per-user + per-location lookups
create index if not exists bop_custom_tools_user_location
  on public.bop_custom_tools (user_id, target_location);


-- ── TABLE: bop_tool_data ─────────────────────────────────────
-- Generic key-value silo for data collected inside deployed tools.
-- Example: a "Lead Manager" tool stores each lead as a row here;
-- a "KPI Tracker" stores its weekly numbers here.
-- RLS keeps every user's entries completely invisible to others.

create table if not exists public.bop_tool_data (
  id         uuid        default gen_random_uuid() primary key,
  created_at timestamptz default now()             not null,
  updated_at timestamptz default now()             not null,
  user_id    uuid        references auth.users(id) on delete cascade not null,
  tool_id    text                                   not null,  -- kebab-case tool slug (e.g. "lead-manager")
  key        text                                   not null,  -- arbitrary field key
  value      jsonb,
  constraint bop_tool_data_unique unique (user_id, tool_id, key)
);

-- Row Level Security
alter table public.bop_tool_data enable row level security;

create policy "Users manage own tool data"
  on public.bop_tool_data
  for all
  using     (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Auto-update updated_at on every write
create or replace function public.bop_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger bop_tool_data_updated_at
  before update on public.bop_tool_data
  for each row execute procedure public.bop_set_updated_at();

-- Fast per-user + per-tool lookups
create index if not exists bop_tool_data_user_tool
  on public.bop_tool_data (user_id, tool_id);
