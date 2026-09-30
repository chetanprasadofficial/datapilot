-- DataPilot schema. Run this in the Supabase SQL editor.

create table workflows (
  id uuid primary key default gen_random_uuid(),
  prompt text not null,
  plan jsonb not null,
  plan_raw text,
  created_at timestamptz default now()
);

create table runs (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid references workflows(id) on delete cascade,
  status text not null default 'queued',
  stats jsonb default '{}',
  error text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz default now()
);

create table run_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references runs(id) on delete cascade,
  name text not null,
  position int not null,
  status text not null default 'pending',
  items_in int default 0,
  items_out int default 0,
  detail jsonb default '{}',
  started_at timestamptz,
  finished_at timestamptz
);

create table sources (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references runs(id) on delete cascade,
  connector text not null,
  url text not null,
  fetched_at timestamptz default now(),
  http_status int,
  robots_allowed boolean,
  snippet text
);

create table records (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references runs(id) on delete cascade,
  data jsonb not null,
  dedupe_key text,
  score real,
  completeness real,
  grounded boolean default true,
  created_at timestamptz default now()
);

create table record_sources (
  record_id uuid references records(id) on delete cascade,
  source_id uuid references sources(id) on delete cascade,
  evidence text,
  primary key (record_id, source_id)
);

create table rejected_rows (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references runs(id) on delete cascade,
  raw jsonb,
  reason text
);
