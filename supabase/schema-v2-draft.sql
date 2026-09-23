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
  department_id uuid not null references departments(id),
  status text not null default 'active' check (status in ('active','exit','resigned')),
  l1_manager_id uuid references employees(id),
  l2_manager_id uuid references employees(id),
  check (l1_manager_id is distinct from id and l2_manager_id is distinct from id)
);
create index on employees(l1_manager_id);

create table app_users (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  employee_id uuid unique references employees(id),
  is_admin boolean not null default false
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
create function me() returns uuid language sql stable security definer as
  $$ select employee_id from app_users where id = auth.uid() $$;
create function is_admin() returns boolean language sql stable security definer as
  $$ select coalesce((select is_admin from app_users where id = auth.uid()), false) $$;
create function can_view(emp uuid) returns boolean language sql stable security definer as
  $$ select is_admin() or emp = me() or exists (select 1 from employees where id = emp and l1_manager_id = me()) $$;
create function can_edit(emp uuid) returns boolean language sql stable security definer as
  $$ select is_admin() or exists (select 1 from employees where id = emp and l1_manager_id = me()) $$;

-- ── RLS (mirror of permissions.ts) ──────────────────────────────────
alter table employees enable row level security;
alter table scorecards enable row level security;
alter table scorecard_metrics enable row level security;
alter table audit_log enable row level security;
alter table departments enable row level security;

create policy "departments readable" on departments for select using (auth.uid() is not null);
create policy "admin writes departments" on departments for all using (is_admin()) with check (is_admin());

create policy "view self, direct reports, or all if admin" on employees for select using (can_view(id));
create policy "admin manages employees" on employees for all using (is_admin()) with check (is_admin());

create policy "view scorecards" on scorecards for select using (can_view(employee_id));
create policy "edit scorecards" on scorecards for all using (can_edit(employee_id)) with check (can_edit(employee_id));

create policy "view metrics" on scorecard_metrics for select
  using (can_view((select employee_id from scorecards s where s.id = scorecard_id)));
create policy "edit metrics" on scorecard_metrics for all
  using (can_edit((select employee_id from scorecards s where s.id = scorecard_id)))
  with check (can_edit((select employee_id from scorecards s where s.id = scorecard_id)));

create policy "view audit" on audit_log for select using (can_view(entity_id));
-- audit rows are written by server code with the service role only.
