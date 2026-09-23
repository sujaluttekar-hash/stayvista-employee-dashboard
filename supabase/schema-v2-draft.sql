-- ═════════════════════════════════════════════════════════════════════
-- DRAFT — NOT A MIGRATION. Do not run as-is.
-- Target schema for v0.3 (people, hierarchy, scorecards). Mirrors
-- src/lib/data/types.ts exactly and src/lib/auth/permissions.ts as RLS.
-- Supersedes the people/profiles/scores tables in 0001_init.sql —
-- reconcile before running (see HANDOFF.md → "Bringing Supabase back").
-- ═════════════════════════════════════════════════════════════════════

create table departments (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  accent text not null check (accent in ('bloom','sky','shine')),
  has_real_metrics boolean not null default false
);

create table employees (
  id uuid primary key default gen_random_uuid(),
  employee_no text unique not null,
  name text not null,
  designation text not null default '',
  department_id uuid references departments(id),  -- null = unassigned
  status text not null default 'active' check (status in ('active','exit','resigned')),
  l1_manager_id uuid references employees(id),
  l2_manager_id uuid references employees(id),
  check (l1_manager_id is distinct from id and l2_manager_id is distinct from id)
);
create index on employees(l1_manager_id);

-- Exactly three role logins. Employees are data, not users.
create table app_users (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null check (role in ('hr','manager','data'))
);

create table review_periods (
  id text primary key,            -- '2026-q3'
  label text not null,
  starts date not null,
  ends date not null
);

create table scorecards (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id),
  period_id text not null references review_periods(id),
  unique (employee_id, period_id)
);

create table scorecard_metrics (
  id uuid primary key default gen_random_uuid(),
  scorecard_id uuid not null references scorecards(id) on delete cascade,
  name text not null,
  description text not null default '',
  type text not null check (type in ('manual','automatic')),
  unit text not null check (unit in ('%','count','days','hours','score')),
  direction text not null check (direction in ('higher_is_better','lower_is_better')),
  target numeric not null,
  weight numeric not null check (weight between 0 and 100),
  actual numeric,
  actual_source text check (actual_source in ('manual','redash','demo')),
  source_config jsonb,             -- { kind:'redash', query_id, value_column }
  sort_order int not null default 0,
  updated_at timestamptz,
  updated_by uuid references app_users(id)
);

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  actor_id uuid references app_users(id),
  action text not null,
  entity_id uuid not null,
  summary text not null
);

-- ── Helpers ─────────────────────────────────────────────────────────
create function my_role() returns text language sql stable security definer as
  $$ select role from app_users where id = auth.uid() $$;

-- ── RLS (mirror of src/lib/auth/permissions.ts) ─────────────────────
--   read everything: any signed-in role
--   employees/departments writes: hr, data
--   scorecards/metrics writes:    manager, data
alter table departments enable row level security;
alter table employees enable row level security;
alter table scorecards enable row level security;
alter table scorecard_metrics enable row level security;
alter table audit_log enable row level security;

create policy "read" on departments for select using (my_role() is not null);
create policy "read" on employees for select using (my_role() is not null);
create policy "read" on scorecards for select using (my_role() is not null);
create policy "read" on scorecard_metrics for select using (my_role() is not null);
create policy "read" on audit_log for select using (my_role() is not null);

create policy "manage departments" on departments for all using (my_role() in ('hr','data')) with check (my_role() in ('hr','data'));
create policy "manage employees" on employees for all using (my_role() in ('hr','data')) with check (my_role() in ('hr','data'));
create policy "edit scorecards" on scorecards for all using (my_role() in ('manager','data')) with check (my_role() in ('manager','data'));
create policy "edit metrics" on scorecard_metrics for all using (my_role() in ('manager','data')) with check (my_role() in ('manager','data'));
-- audit rows are written by server code with the service role only.
