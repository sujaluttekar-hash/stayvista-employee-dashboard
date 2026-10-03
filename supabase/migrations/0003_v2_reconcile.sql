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
-- SAFETY STOP. This file DROPS and recreates every table below.
-- If the database already holds employees, running it again would
-- wipe real data, so it refuses. Never re-run it on a live
-- project: add a new numbered migration instead (see 0005).
-- ------------------------------------------------------------
do $$
begin
  if to_regclass('public.employees') is not null and exists (select 1 from public.employees) then
    raise exception 'STOPPED: public.employees already has data and this migration would delete it. Use a new migration (0005 or later) instead.';
  end if;
end $$;

-- ------------------------------------------------------------
-- Drop v1 tables (people/profiles/scores model). Safe: v1 was
-- never deployed against a live project (Supabase was removed
-- for preview mode in v0.2, before any real data existed).
-- ------------------------------------------------------------
-- Old v1 tables (never had real data in them):
drop table if exists redash_sync_log cascade;
drop table if exists custom_kras cascade;
drop table if exists scores cascade;
drop table if exists scorecard_templates cascade;
drop table if exists profiles cascade;
drop table if exists people cascade;
-- This migration's own tables too, so it's safe to re-run from scratch
-- any time (e.g. after changing the department list or review periods)
-- without hitting "relation already exists" partway through, which
-- silently stops the rest of the script and was the cause of repeated
-- confusion earlier (new periods/departments not showing up because
-- the insert statements for them never actually ran).
drop table if exists audit_log cascade;
drop table if exists scorecard_metrics cascade;
drop table if exists scorecards cascade;
drop table if exists review_periods cascade;
drop table if exists app_users cascade;
drop table if exists employees cascade;
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

-- Explicit ids matching src/lib/data/seed.ts DEPARTMENTS exactly, so the
-- local demo store and Supabase share the same primary keys -- required
-- for anything the app writes (e.g. adding an employee to a department)
-- to resolve correctly against real Supabase rows.
insert into departments (id, slug, name, accent, has_real_metrics) values
  ('a4994450-42cb-4d2f-8721-0326409da2f1', 'sales', 'Sales', 'sky', false),
  ('bb97dda3-bda5-4c3f-b940-102fceeeb2c3', 'stake-holder-finance-services', 'Stake Holder Finance Services', 'shine', false),
  ('ece872c9-2ec4-4be4-bafb-4a54f4d83cee', 'revenue', 'Revenue', 'bloom', false),
  ('e5152f65-bc2e-44fc-b5c4-bc2804518eec', 'supply-growth', 'Supply Growth', 'sky', false),
  ('39cc8b0b-f20d-4642-97f1-34022fb955ba', 'financial-control-and-support', 'Financial Control & Support', 'shine', false),
  ('72cc939f-6f18-413f-b247-e2b87ae1347a', 'key-account', 'Key Account', 'bloom', false),
  ('d9cd8361-d386-4349-932d-cb9e069d19ec', 'channel', 'Channel', 'sky', false),
  ('f408f6ff-c5f0-46b1-ba98-5f78f9c4dfa5', 'product', 'Product', 'shine', false),
  ('20f02948-042b-4323-aea6-783f3f65ba40', 'it', 'IT', 'bloom', false),
  ('3a3212ea-95bb-495e-8629-008042248871', 'reservation', 'Reservation', 'sky', false),
  ('c6c846c5-c837-46c4-ab7a-78ed0fd27779', 'vista-signature-experience', 'Vista Signature Experience', 'shine', false),
  ('dfe3b3d1-7cdc-4e09-b5ed-03d109f35091', 'retention', 'Retention', 'bloom', false),
  ('ffacceb8-149f-4196-b88a-4b888e025916', 'brand-strategy-and-partnership', 'Brand Strategy & Partnership', 'sky', false),
  ('58a5c84b-e3e9-4b59-a8b1-9ae7f4b32586', 'property-maintenance', 'Property Maintenance', 'shine', false),
  ('e5810c11-92b9-454b-90f8-e31071afff42', 'stay-experience', 'Stay Experience', 'bloom', false),
  ('93775a28-b7de-4042-8b1a-cd85f8dd5e91', 'photography', 'Photography', 'sky', false),
  ('795fc772-d620-48ba-becc-3eb7fcce1f3d', 'property-ops', 'Property Ops', 'shine', false),
  ('8fa78730-140f-4c5f-a41f-88668fd58e4a', 'operations-and-strategy', 'Operations & Strategy', 'bloom', false),
  ('21be72be-93b7-4e73-bf9b-9e67c2d42459', 'guest-support', 'Guest Support', 'sky', false),
  ('f8369df7-2fe5-410b-b03c-42d90517d5e0', 'engineering', 'Engineering', 'shine', false),
  ('3935d3c5-dc2c-4280-a1b8-5db1c46e5c90', 'procurement', 'Procurement', 'bloom', false),
  ('0309dc96-fc3f-4221-bb0d-06e0e05e7540', 'founders-office', 'Founder''s Office', 'sky', false),
  ('e3e099b7-d1da-444f-9a83-a7b743f184de', 'chef', 'Chef', 'shine', false),
  ('5b969951-cdb6-4bb4-9abe-b360f3b46988', 'acquisition', 'Acquisition', 'bloom', false),
  ('b4de9782-6a13-442a-9ecd-8b514f17a554', 'audit', 'Audit', 'sky', false),
  ('d502ca6f-e706-4a6b-8f80-67e4dd06cc32', 'brand-communication', 'Brand Communication', 'shine', false),
  ('7608e015-b9e8-4a90-b76c-27bb56aa19c6', 'design', 'Design', 'bloom', false),
  ('46f275e4-9d35-45e5-bd4b-17ad715531a4', 'food-and-beverage', 'F&B Ops', 'sky', false),
  ('178c41fe-56a8-4db7-bc0d-a676ceae1ce7', 'am-ops', 'AM Ops', 'shine', false),
  ('bbb28eb7-fa92-46e8-a46c-ffc33d468227', 'process-optimization', 'Process Optimization', 'bloom', false),
  ('a69ba122-c7fa-4e1c-9a23-c7b294aa1e5e', 'account-management-central', 'Account Management Central', 'sky', false),
  ('664757d9-6afe-44e7-9596-e99aa592caf2', 'legal-and-compliance', 'Legal & Compliance', 'shine', false),
  ('61660b86-93f8-4f60-9ebc-b4d86225c02b', 'facility-management-services', 'Facility Management Services', 'bloom', false),
  ('c5704524-4285-4c1c-9e77-9589245da708', 'operations', 'Operations', 'sky', false),
  ('f6e21cc1-088a-4157-b338-f8fee700c2bb', 'talent-acquisition', 'Talent Acquisition', 'shine', false),
  ('77775d6d-609d-40b2-b373-6b2730b6ef67', 'creative-studio', 'Creative Studio', 'bloom', false),
  ('12c3c502-1f18-4885-80a1-f69f0452747e', 'business-intelligence', 'Business Intelligence', 'sky', true),
  ('fcc00397-e00d-4fc5-bf79-71bdde7f0ad0', 'events-and-experience', 'Events & Experience', 'shine', false),
  ('8ad8af03-2668-453d-865a-1c2774435154', 'stay-ops', 'Stay Ops', 'bloom', false),
  ('1b825ac3-abfa-4a69-a71e-594ddfced89e', 'lead-management', 'Lead Management', 'sky', false),
  ('fdab28be-9dbf-4105-8d2f-177ca88be99a', 'resorts-and-residences', 'Resorts & Residences', 'shine', false),
  ('77556c06-4a57-4812-bce7-f5e8b6943e03', 'butler', 'Butler', 'bloom', false),
  ('2b4a9448-c115-42f2-a12e-f1f168079848', 'admin', 'Admin', 'sky', false),
  ('4c6bdbbb-d2c3-451a-8c53-ec4c849aaf57', 'organization-development-and-landd', 'Organization Development & L&D', 'shine', false),
  ('b8afdc5f-224f-41c5-bca1-ecf66252ae8b', 'growth-marketing', 'Growth Marketing', 'bloom', false),
  ('bcb14490-b8f7-4501-8e7e-f3a0056c6fdc', 'intelligence', 'Intelligence', 'sky', false),
  ('32df338f-eb9d-4d49-8bfd-740b0f4786f6', 'people-success', 'People Success', 'shine', false),
  ('db6f36a2-1561-414a-aad1-75b3156079bc', 'finance-and-accounts', 'Finance & Accounts', 'bloom', false),
  ('1f97bc17-ce81-45d5-b1da-d3ae922a91d5', 'corporate-sales', 'Corporate Sales', 'sky', false);

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
-- REVIEW PERIODS — scorecards run month to month, e.g. '2026-09'
-- ============================================================
create table review_periods (
  id text primary key,
  label text not null,
  starts date not null,
  ends date not null
);

insert into review_periods (id, label, starts, ends) values
  ('2026-01', 'January 2026', '2026-01-01', '2026-01-31'),
  ('2026-02', 'February 2026', '2026-02-01', '2026-02-28'),
  ('2026-03', 'March 2026', '2026-03-01', '2026-03-31'),
  ('2026-04', 'April 2026', '2026-04-01', '2026-04-30'),
  ('2026-05', 'May 2026', '2026-05-01', '2026-05-31'),
  ('2026-06', 'June 2026', '2026-06-01', '2026-06-30'),
  ('2026-07', 'July 2026', '2026-07-01', '2026-07-31'),
  ('2026-08', 'August 2026', '2026-08-01', '2026-08-31'),
  ('2026-09', 'September 2026', '2026-09-01', '2026-09-30'),
  ('2026-10', 'October 2026', '2026-10-01', '2026-10-31'),
  ('2026-11', 'November 2026', '2026-11-01', '2026-11-30'),
  ('2026-12', 'December 2026', '2026-12-01', '2026-12-31');

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
