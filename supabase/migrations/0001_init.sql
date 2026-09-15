-- ============================================================
-- StayVista Employee Dashboard — initial schema
-- v1 · 2026-09-15
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- ROLES
-- ------------------------------------------------------------
create type app_role as enum ('manager', 'hr', 'data');

-- ------------------------------------------------------------
-- DEPARTMENTS — the 12 tracked departments
-- ------------------------------------------------------------
create table departments (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  redash_query_id int,              -- null until wired; data role fills this in
  created_at timestamptz default now()
);

insert into departments (slug, name) values
  ('fnb',            'Culinary & F&B'),
  ('revenue',        'Revenue'),
  ('kam',             'KAM'),
  ('tech',            'Tech'),
  ('people-success',  'People Success'),
  ('finance',          'Finance'),
  ('acquisition',      'Acquisition'),
  ('operations',        'Operations'),
  ('facility-mgmt',      'Facility Management'),
  ('events-experience',   'Events & Experience'),
  ('transformation-interiors', 'Transformation and Interiors'),
  ('brand-marketing',       'Brand & Marketing');

-- ------------------------------------------------------------
-- PROFILES — one row per auth.users, carries role + scope
-- ------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role app_role not null,
  -- for role='manager': which person-row is THEM (used to scope "my team")
  person_id uuid,
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- PEOPLE — the roster, one row per tracked employee, any department
-- ------------------------------------------------------------
create table people (
  id uuid primary key default gen_random_uuid(),
  employee_no text unique not null,
  name text not null,
  role_title text not null,
  department_id uuid not null references departments(id),
  manager_id uuid references people(id),   -- self-referencing org chart
  squad text,
  status text not null default 'Active' check (status in ('Active','Exit','Resigned')),
  email text,
  created_at timestamptz default now()
);

alter table profiles add constraint profiles_person_fk
  foreign key (person_id) references people(id);

-- ------------------------------------------------------------
-- SCORECARD TEMPLATES — one active template per department
-- (placeholder metrics for the 11 new departments; F&B ported from Hearth)
-- ------------------------------------------------------------
create table scorecard_templates (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references departments(id),
  version int not null default 1,
  is_active boolean not null default true,
  created_at timestamptz default now()
);

create table scorecard_metrics (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references scorecard_templates(id) on delete cascade,
  key text not null,                 -- stable id, e.g. 'training', 'avgfeedback'
  name text not null,
  definition text default '',
  weight numeric not null check (weight > 0 and weight <= 1),
  target text default '',
  unit text default '%',             -- '' for counts/ratings, '%' for percentages
  lower_is_better boolean default false,
  bands jsonb not null default '["","","","",""]'::jsonb,  -- 5 band labels
  sort_order int default 0,
  is_placeholder boolean not null default false,  -- true until dept lead confirms real KPIs
  unique (template_id, key)
);

-- ------------------------------------------------------------
-- SCORES — one row per person × month × metric
-- ------------------------------------------------------------
create table scores (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id) on delete cascade,
  month date not null,               -- always day 1 of month, e.g. 2026-04-01
  metric_id uuid not null references scorecard_metrics(id),
  actual numeric,
  band int check (band between 1 and 5),
  weighted numeric,
  source text not null default 'manual' check (source in ('redash','manual','manager_override')),
  updated_by uuid references profiles(id),
  updated_at timestamptz default now(),
  unique (person_id, month, metric_id)
);

-- ------------------------------------------------------------
-- CUSTOM KRAs — manager-added, per person × month
-- ------------------------------------------------------------
create table custom_kras (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id) on delete cascade,
  month date not null,
  name text not null,
  definition text default '',
  weight numeric not null default 0.1,
  actual text,
  band int check (band between 1 and 5),
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- REDASH SYNC LOG — audit trail for the "data" role's live pulls
-- ------------------------------------------------------------
create table redash_sync_log (
  id uuid primary key default gen_random_uuid(),
  department_id uuid references departments(id),
  query_id int,
  run_by uuid references profiles(id),
  run_at timestamptz default now(),
  status text check (status in ('success','error')),
  rows_synced int,
  error_message text
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table profiles enable row level security;
alter table people enable row level security;
alter table departments enable row level security;
alter table scorecard_templates enable row level security;
alter table scorecard_metrics enable row level security;
alter table scores enable row level security;
alter table custom_kras enable row level security;
alter table redash_sync_log enable row level security;

-- helper: current user's role + person_id, cached per statement
create or replace function my_role() returns app_role
language sql stable security definer as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function my_person_id() returns uuid
language sql stable security definer as $$
  select person_id from profiles where id = auth.uid()
$$;

-- a person is "my team" if their manager_id is my own person_id
create or replace function is_my_report(p_person_id uuid) returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from people
    where id = p_person_id and manager_id = my_person_id()
  )
$$;

-- ---------- profiles ----------
create policy "read own profile" on profiles for select using (id = auth.uid());
create policy "hr/data read all profiles" on profiles for select using (my_role() in ('hr','data'));

-- ---------- departments (everyone can read; only data can edit redash_query_id) ----------
create policy "everyone reads departments" on departments for select using (true);
create policy "data edits departments" on departments for update using (my_role() = 'data');

-- ---------- people ----------
-- HR + data: full org visibility. Manager: self + direct reports only.
create policy "hr/data read all people" on people for select using (my_role() in ('hr','data'));
create policy "manager reads own team" on people for select
  using (my_role() = 'manager' and (id = my_person_id() or manager_id = my_person_id()));
create policy "hr updates status" on people for update using (my_role() = 'hr');

-- ---------- scorecard templates + metrics (read-only for everyone, data role edits) ----------
create policy "everyone reads templates" on scorecard_templates for select using (true);
create policy "data edits templates" on scorecard_templates for all using (my_role() = 'data');
create policy "everyone reads metrics" on scorecard_metrics for select using (true);
create policy "data edits metrics" on scorecard_metrics for all using (my_role() = 'data');

-- ---------- scores — the core permission rule ----------
-- Read: hr + data see everything; manager sees own team's scores.
create policy "hr/data read all scores" on scores for select using (my_role() in ('hr','data'));
create policy "manager reads team scores" on scores for select using (is_my_report(person_id));

-- Write: ONLY a manager, and ONLY for their own direct reports.
-- HR explicitly cannot write scores (status only, via `people`).
-- `data` role does not write scores through RLS at all — Redash sync writes
-- via the server-side API route using the service-role key, which bypasses RLS
-- entirely and stamps source='redash'. This keeps "who can override a score"
-- to a single, auditable path (manager, source='manager_override').
create policy "manager writes own team scores" on scores for insert
  with check (my_role() = 'manager' and is_my_report(person_id));
create policy "manager updates own team scores" on scores for update
  using (my_role() = 'manager' and is_my_report(person_id));

-- ---------- custom KRAs — same rule as scores ----------
create policy "hr/data read all custom kras" on custom_kras for select using (my_role() in ('hr','data'));
create policy "manager reads team custom kras" on custom_kras for select using (is_my_report(person_id));
create policy "manager writes team custom kras" on custom_kras for insert
  with check (my_role() = 'manager' and is_my_report(person_id));
create policy "manager updates team custom kras" on custom_kras for update
  using (my_role() = 'manager' and is_my_report(person_id));

-- ---------- redash sync log — data role only ----------
create policy "data reads sync log" on redash_sync_log for select using (my_role() = 'data');
create policy "hr reads sync log" on redash_sync_log for select using (my_role() = 'hr');
