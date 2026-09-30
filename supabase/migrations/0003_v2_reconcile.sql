-- ============================================================
-- StayVista Employee Dashboard — v0.4 schema
-- Reconciles schema-v2-draft.sql into a real migration.
-- Mirrors src/lib/data/types.ts (Store) exactly, and
-- src/lib/auth/permissions.ts as RLS. Supersedes 0001_init.sql:
-- drops the old people/profiles/scores model and replaces it
-- with employees/app_users/scorecards, per HANDOFF.md.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Drop v1 tables (people/profiles/scores model). Safe: v1 was
-- never deployed against a live project (Supabase was removed
-- for preview mode in v0.2, before any real data existed).
-- ------------------------------------------------------------
drop table if exists redash_sync_log cascade;
drop table if exists custom_kras cascade;
drop table if exists scores cascade;
drop table if exists scorecard_metrics cascade;
drop table if exists scorecard_templates cascade;
drop table if exists profiles cascade;
drop table if exists people cascade;
drop table if exists departments cascade;
drop function if exists my_role() cascade;
drop function if exists my_person_id() cascade;
drop function if exists is_my_report(uuid) cascade;
drop type if exists app_role cascade;

-- ============================================================
-- DEPARTMENTS
-- ============================================================
create table departments (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  accent text not null check (accent in ('bloom','sky','shine')),
  has_real_metrics boolean not null default false
);

-- Matches src/lib/data/seed.ts DEPARTMENTS exactly (50 real StayVista
-- departments/sub-functions, including Business Intelligence, which
-- owns the 3 role logins' sample employees).
insert into departments (slug, name, accent, has_real_metrics) values
  ('management', 'Management', 'bloom', false),
  ('sales', 'Sales', 'sky', false),
  ('stake-holder-finance-services', 'Stake Holder Finance Services', 'shine', false),
  ('revenue', 'Revenue', 'bloom', false),
  ('supply-growth', 'Supply Growth', 'sky', false),
  ('financial-control-and-support', 'Financial Control & Support', 'shine', false),
  ('key-account', 'Key Account', 'bloom', false),
  ('channel', 'Channel', 'sky', false),
  ('product', 'Product', 'shine', false),
  ('it', 'IT', 'bloom', false),
  ('reservation', 'Reservation', 'sky', false),
  ('vista-signature-experience', 'Vista Signature Experience', 'shine', false),
  ('retention', 'Retention', 'bloom', false),
  ('brand-strategy-and-partnership', 'Brand Strategy & Partnership', 'sky', false),
  ('property-maintenance', 'Property Maintenance', 'shine', false),
  ('stay-experience', 'Stay Experience', 'bloom', false),
  ('photography', 'Photography', 'sky', false),
  ('property-ops', 'Property Ops', 'shine', false),
  ('operations-and-strategy', 'Operations & Strategy', 'bloom', false),
  ('guest-support', 'Guest Support', 'sky', false),
  ('engineering', 'Engineering', 'shine', false),
  ('procurement', 'Procurement', 'bloom', false),
  ('founders-office', 'Founder''s Office', 'sky', false),
  ('chef', 'Chef', 'shine', false),
  ('acquisition', 'Acquisition', 'bloom', false),
  ('audit', 'Audit', 'sky', false),
  ('brand-communication', 'Brand Communication', 'shine', false),
  ('design', 'Design', 'bloom', false),
  ('food-and-beverage', 'Food & Beverage', 'sky', false),
  ('am-ops', 'AM Ops', 'shine', false),
  ('process-optimization', 'Process Optimization', 'bloom', false),
  ('account-management-central', 'Account Management Central', 'sky', false),
  ('legal-and-compliance', 'Legal & Compliance', 'shine', false),
  ('facility-management-services', 'Facility Management Services', 'bloom', false),
  ('operations', 'Operations', 'sky', false),
  ('talent-acquisition', 'Talent Acquisition', 'shine', false),
  ('creative-studio', 'Creative Studio', 'bloom', false),
  ('business-intelligence', 'Business Intelligence', 'sky', true),
  ('events-and-experience', 'Events & Experience', 'shine', false),
  ('stay-ops', 'Stay Ops', 'bloom', false),
  ('lead-management', 'Lead Management', 'sky', false),
  ('resorts-and-residences', 'Resorts & Residences', 'shine', false),
  ('butler', 'Butler', 'bloom', false),
  ('admin', 'Admin', 'sky', false),
  ('organization-development-and-landd', 'Organization Development & L&D', 'shine', false),
  ('growth-marketing', 'Growth Marketing', 'bloom', false),
  ('intelligence', 'Intelligence', 'sky', false),
  ('people-success', 'People Success', 'shine', false),
  ('finance-and-accounts', 'Finance & Accounts', 'bloom', false),
  ('corporate-sales', 'Corporate Sales', 'sky', false);

-- ============================================================
-- EMPLOYEES — records, not logins. L1/L2 are informational only
-- (no permission meaning); enforced access lives in app_users/RLS.
-- ============================================================
create table employees (
  id uuid primary key default gen_random_uuid(),
  employee_no text unique not null,
  name text not null,
  designation text not null default '',
  department_id uuid references departments(id) on delete set null, -- null = unassigned
  status text not null default 'active' check (status in ('active','exit','resigned')),
  l1_manager_id uuid references employees(id) on delete set null,
  l2_manager_id uuid references employees(id) on delete set null,
  created_at timestamptz not null default now(),
  check (l1_manager_id is distinct from id and l2_manager_id is distinct from id)
);
create index on employees(department_id);
create index on employees(l1_manager_id);
create index on employees(l2_manager_id);

-- ============================================================
-- APP_USERS — exactly three role logins (hr, manager, data)
-- ============================================================
create table app_users (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null check (role in ('hr','manager','data')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- REVIEW PERIODS — quarterly cycle, e.g. '2026-q3'
-- ============================================================
create table review_periods (
  id text primary key,
  label text not null,
  starts date not null,
  ends date not null
);

insert into review_periods (id, label, starts, ends) values
  ('2026-q3', 'Q3 2026 (Jul–Sep)', '2026-07-01', '2026-09-30'),
  ('2026-q4', 'Q4 2026 (Oct–Dec)', '2026-10-01', '2026-12-31');

-- ============================================================
-- SCORECARDS — one per employee × period
-- ============================================================
create table scorecards (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  period_id text not null references review_periods(id),
  created_at timestamptz not null default now(),
  unique (employee_id, period_id)
);
create index on scorecards(employee_id);
create index on scorecards(period_id);

-- ============================================================
-- SCORECARD METRICS — manual or automatic (Redash), scored per
-- metric, weighted average = overall score.
-- ============================================================
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
  updated_by uuid references app_users(id) on delete set null
);
create index on scorecard_metrics(scorecard_id);

-- ============================================================
-- AUDIT LOG — every write goes through src/app/actions.ts and
-- lands here. Written server-side with the service-role key only.
-- ============================================================
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  actor_id uuid references app_users(id) on delete set null,
  action text not null,          -- e.g. 'metric.update', 'employee.assign_manager'
  entity_id uuid not null,
  summary text not null
);
create index on audit_log(entity_id);
create index on audit_log(at desc);

-- ============================================================
-- ROW LEVEL SECURITY — mirrors src/lib/auth/permissions.ts
--   read:  any signed-in role sees everything
--   employees/departments writes: hr, data
--   scorecards/metrics writes:    manager, data
--   audit_log writes: server only (service-role key bypasses RLS)
-- ============================================================
alter table departments enable row level security;
alter table employees enable row level security;
alter table app_users enable row level security;
alter table review_periods enable row level security;
alter table scorecards enable row level security;
alter table scorecard_metrics enable row level security;
alter table audit_log enable row level security;

create or replace function my_role() returns text
language sql stable security definer as
$$ select role from app_users where id = auth.uid() $$;

-- ---------- app_users ----------
create policy "read own user row" on app_users for select using (id = auth.uid());
create policy "hr/data read all users" on app_users for select using (my_role() in ('hr','data'));

-- ---------- read everything else: any signed-in role ----------
create policy "read" on departments for select using (my_role() is not null);
create policy "read" on employees for select using (my_role() is not null);
create policy "read" on review_periods for select using (my_role() is not null);
create policy "read" on scorecards for select using (my_role() is not null);
create policy "read" on scorecard_metrics for select using (my_role() is not null);
create policy "read" on audit_log for select using (my_role() is not null);

-- ---------- writes ----------
create policy "manage departments" on departments for all
  using (my_role() in ('hr','data')) with check (my_role() in ('hr','data'));
create policy "manage employees" on employees for all
  using (my_role() in ('hr','data')) with check (my_role() in ('hr','data'));
create policy "edit scorecards" on scorecards for all
  using (my_role() in ('manager','data')) with check (my_role() in ('manager','data'));
create policy "edit metrics" on scorecard_metrics for all
  using (my_role() in ('manager','data')) with check (my_role() in ('manager','data'));
-- audit_log has no insert/update policy for regular roles on purpose;
-- only the service-role key (used server-side in actions.ts) can write it.
