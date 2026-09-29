-- ============================================================
-- Seed data mirroring src/lib/data/seed.ts (the preview sample
-- data), so a fresh Supabase project starts with the same
-- BI team, hierarchy and scorecards the app already shows.
--
-- NOT included here: app_users. That table's id column is a
-- foreign key to auth.users(id), so rows can only be created
-- after each of the three logins (HR / Manager / Data team)
-- signs up or is invited through Supabase Auth. See the
-- commented block at the bottom of this file for the exact
-- statement to run once those auth users exist.
-- ============================================================

do $$
declare
  v_dept_bi uuid;
  v_ronak uuid;
  v_sujal uuid;
  v_aditya uuid;
  v_dhanesh uuid;
  v_sc uuid;
begin

  select id into v_dept_bi from departments where slug = 'business-intelligence';

  -- ---------- employees (hierarchy: Ronak → Sujal, Aditya; Aditya → Dhanesh) ----------
  insert into employees (employee_no, name, designation, department_id, status)
    values ('BI-001', 'Ronak', 'BI Lead', v_dept_bi, 'active')
    returning id into v_ronak;

  insert into employees (employee_no, name, designation, department_id, status, l1_manager_id)
    values ('BI-002', 'Sujal', 'Data Analyst — Automation', v_dept_bi, 'active', v_ronak)
    returning id into v_sujal;

  insert into employees (employee_no, name, designation, department_id, status, l1_manager_id)
    values ('BI-003', 'Aditya', 'Senior Data Analyst', v_dept_bi, 'active', v_ronak)
    returning id into v_aditya;

  insert into employees (employee_no, name, designation, department_id, status, l1_manager_id, l2_manager_id)
    values ('BI-004', 'Dhanesh', 'Data Analyst', v_dept_bi, 'active', v_aditya, v_ronak)
    returning id into v_dhanesh;

  -- ---------- Ronak's scorecard ----------
  insert into scorecards (employee_id, period_id) values (v_ronak, '2026-q3') returning id into v_sc;
  insert into scorecard_metrics (scorecard_id, name, description, type, unit, direction, target, weight, actual, actual_source, source_config, sort_order, updated_at, updated_by) values
  (v_sc, 'Revenue reporting accuracy', 'Revenue reports matching finance close figures', 'automatic', '%', 'higher_is_better', 98, 25, null, null, '{"kind":"redash","query_id":null,"value_column":"value"}', 0, null, null),
  (v_sc, 'Dashboard automation', 'Manual reports replaced by automated dashboards', 'manual', 'count', 'higher_is_better', 5, 20, 4, 'manual', null, 1, now(), null),
  (v_sc, 'Team request SLA', 'Data requests closed within agreed turnaround', 'automatic', '%', 'higher_is_better', 90, 25, null, null, '{"kind":"redash","query_id":null,"value_column":"value"}', 2, null, null),
  (v_sc, 'Stakeholder satisfaction', 'Quarterly survey score from department heads (out of 5)', 'manual', 'score', 'higher_is_better', 4.5, 15, null, null, null, 3, null, null),
  (v_sc, 'Team capability building', 'Trainings or knowledge sessions run for the team', 'manual', 'count', 'higher_is_better', 3, 15, 2, 'manual', null, 4, now(), null);

  -- ---------- Sujal's scorecard ----------
  insert into scorecards (employee_id, period_id) values (v_sujal, '2026-q3') returning id into v_sc;
  insert into scorecard_metrics (scorecard_id, name, description, type, unit, direction, target, weight, actual, actual_source, source_config, sort_order, updated_at, updated_by) values
  (v_sc, 'Automation scripts shipped', 'Bots or pipelines moved to production', 'manual', 'count', 'higher_is_better', 4, 30, 3, 'manual', null, 0, now(), null),
  (v_sc, 'Manual hours saved', 'Estimated team hours saved per month by automations', 'manual', 'hours', 'higher_is_better', 40, 25, 32, 'manual', null, 1, now(), null),
  (v_sc, 'Pipeline uptime', 'Scheduled syncs completing without failure', 'automatic', '%', 'higher_is_better', 99, 25, null, null, '{"kind":"redash","query_id":null,"value_column":"value"}', 2, null, null),
  (v_sc, 'Request turnaround', 'Average days to close an ad-hoc data request', 'automatic', 'days', 'lower_is_better', 2, 20, null, null, '{"kind":"redash","query_id":null,"value_column":"value"}', 3, null, null);

  -- ---------- Aditya's scorecard ----------
  insert into scorecards (employee_id, period_id) values (v_aditya, '2026-q3') returning id into v_sc;
  insert into scorecard_metrics (scorecard_id, name, description, type, unit, direction, target, weight, actual, actual_source, source_config, sort_order, updated_at, updated_by) values
  (v_sc, 'Revenue reporting accuracy', 'Revenue reports matching finance close figures', 'automatic', '%', 'higher_is_better', 98, 30, null, null, '{"kind":"redash","query_id":null,"value_column":"value"}', 0, null, null),
  (v_sc, 'Dashboards delivered', 'New dashboards signed off by the requesting team', 'manual', 'count', 'higher_is_better', 5, 25, 5, 'manual', null, 1, now(), null),
  (v_sc, 'Request turnaround', 'Average days to close an ad-hoc data request', 'automatic', 'days', 'lower_is_better', 2, 20, null, null, '{"kind":"redash","query_id":null,"value_column":"value"}', 2, null, null),
  (v_sc, 'Analysis reviews', 'Junior analyses reviewed before they go to stakeholders', 'manual', 'count', 'higher_is_better', 6, 25, null, null, null, 3, null, null);

  -- ---------- Dhanesh's scorecard ----------
  insert into scorecards (employee_id, period_id) values (v_dhanesh, '2026-q3') returning id into v_sc;
  insert into scorecard_metrics (scorecard_id, name, description, type, unit, direction, target, weight, actual, actual_source, source_config, sort_order, updated_at, updated_by) values
  (v_sc, 'Report accuracy', 'Recurring reports shipped without a correction', 'automatic', '%', 'higher_is_better', 97, 30, null, null, '{"kind":"redash","query_id":null,"value_column":"value"}', 0, null, null),
  (v_sc, 'On-time report delivery', 'Recurring reports delivered by their scheduled time', 'manual', '%', 'higher_is_better', 95, 30, 88, 'manual', null, 1, now(), null),
  (v_sc, 'Request turnaround', 'Average days to close an ad-hoc data request', 'automatic', 'days', 'lower_is_better', 3, 20, null, null, '{"kind":"redash","query_id":null,"value_column":"value"}', 2, null, null),
  (v_sc, 'Learning milestones', 'Agreed courses or certifications completed', 'manual', 'count', 'higher_is_better', 2, 20, null, null, null, 3, null, null);

end $$;

-- ============================================================
-- The three logins — run manually, once, after creating each
-- person in Supabase Auth (dashboard: Authentication → Users →
-- Add user, or have them sign up). Replace the UUIDs below with
-- the real auth.users.id values Supabase assigns.
-- ============================================================
-- insert into app_users (id, display_name, role) values
--   ('00000000-0000-0000-0000-000000000001', 'HR', 'hr'),
--   ('00000000-0000-0000-0000-000000000002', 'Manager', 'manager'),
--   ('00000000-0000-0000-0000-000000000003', 'Data team', 'data');
