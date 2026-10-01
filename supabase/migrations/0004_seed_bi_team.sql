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
  v_dept_bi uuid := '12c3c502-1f18-4885-80a1-f69f0452747e';
  v_ronak uuid := '8aaaf346-e31d-4fbb-b04e-92c1ee5dcde9';
  v_sujal uuid := '07ff6885-1d83-47d5-adcc-51bb29ebff32';
  v_aditya uuid := 'db7952e1-aa34-4e43-a691-eff765c492db';
  v_dhanesh uuid := '329a9467-5fe7-420a-8096-6ec2484c64b7';
  v_sc uuid;
begin

  -- ---------- employees (hierarchy: Ronak → Sujal, Aditya; Aditya → Dhanesh) ----------
  -- Explicit ids matching src/lib/data/seed.ts exactly, same reason as the
  -- department ids in 0003 -- the local demo store and Supabase must share
  -- primary keys for writes (e.g. adding a metric, assigning a manager) to
  -- resolve against the right row on both sides.
  insert into employees (id, employee_no, name, designation, department_id, status)
    values (v_ronak, 'BI-001', 'Ronak', 'BI Lead', v_dept_bi, 'active');

  insert into employees (id, employee_no, name, designation, department_id, status, l1_manager_id)
    values (v_sujal, 'BI-002', 'Sujal', 'Data Analyst — Automation', v_dept_bi, 'active', v_ronak);

  insert into employees (id, employee_no, name, designation, department_id, status, l1_manager_id)
    values (v_aditya, 'BI-003', 'Aditya', 'Senior Data Analyst', v_dept_bi, 'active', v_ronak);

  insert into employees (id, employee_no, name, designation, department_id, status, l1_manager_id, l2_manager_id)
    values (v_dhanesh, 'BI-004', 'Dhanesh', 'Data Analyst', v_dept_bi, 'active', v_aditya, v_ronak);

  -- ---------- Ronak's scorecard ----------
  v_sc := 'eedf7a15-99f4-4965-8035-9545ee643edc';
  insert into scorecards (id, employee_id, period_id) values (v_sc, v_ronak, '2026-09');
  insert into scorecard_metrics (scorecard_id, id, name, description, type, unit, direction, target, weight, actual, actual_source, source_config, sort_order, updated_at, updated_by) values
  (v_sc, '2f2f840a-1a95-4492-8fd7-0f32463f20b6', 'Revenue reporting accuracy', 'Revenue reports matching finance close figures', 'automatic', '%', 'higher_is_better', 98, 25, null, null, '{"kind":"redash","query_id":null,"value_column":"value"}', 0, null, null),
  (v_sc, '7606924c-4253-46b1-acce-3361aa853df0', 'Dashboard automation', 'Manual reports replaced by automated dashboards', 'manual', 'count', 'higher_is_better', 5, 20, 4, 'manual', null, 1, now(), null),
  (v_sc, '8d6cc18b-6d22-4efb-a3a9-87c783d3c7bd', 'Team request SLA', 'Data requests closed within agreed turnaround', 'automatic', '%', 'higher_is_better', 90, 25, null, null, '{"kind":"redash","query_id":null,"value_column":"value"}', 2, null, null),
  (v_sc, '1d08fc38-b24b-4d94-8dab-4b46c5cb4bc3', 'Stakeholder satisfaction', 'Quarterly survey score from department heads (out of 5)', 'manual', 'score', 'higher_is_better', 4.5, 15, null, null, null, 3, null, null),
  (v_sc, '2d144702-a0a7-4fee-8e70-6fa781a7005c', 'Team capability building', 'Trainings or knowledge sessions run for the team', 'manual', 'count', 'higher_is_better', 3, 15, 2, 'manual', null, 4, now(), null);

  -- ---------- Sujal's scorecard ----------
  v_sc := 'fed7db37-8744-4973-a65c-da70ad96980c';
  insert into scorecards (id, employee_id, period_id) values (v_sc, v_sujal, '2026-09');
  insert into scorecard_metrics (scorecard_id, id, name, description, type, unit, direction, target, weight, actual, actual_source, source_config, sort_order, updated_at, updated_by) values
  (v_sc, '34833ac9-df64-43d3-af36-9221784be42f', 'Automation scripts shipped', 'Bots or pipelines moved to production', 'manual', 'count', 'higher_is_better', 4, 30, 3, 'manual', null, 0, now(), null),
  (v_sc, '88ecd36f-964a-4727-adb0-f77bb0f0c29d', 'Manual hours saved', 'Estimated team hours saved per month by automations', 'manual', 'hours', 'higher_is_better', 40, 25, 32, 'manual', null, 1, now(), null),
  (v_sc, 'daef90ec-5c30-4ede-abb9-ac720169d880', 'Pipeline uptime', 'Scheduled syncs completing without failure', 'automatic', '%', 'higher_is_better', 99, 25, null, null, '{"kind":"redash","query_id":null,"value_column":"value"}', 2, null, null),
  (v_sc, '932f1bd3-aa73-4042-8435-350004896c3a', 'Request turnaround', 'Average days to close an ad-hoc data request', 'automatic', 'days', 'lower_is_better', 2, 20, null, null, '{"kind":"redash","query_id":null,"value_column":"value"}', 3, null, null);

  -- ---------- Aditya's scorecard ----------
  v_sc := '391a152a-3e39-4aa6-a051-aaa9f6011338';
  insert into scorecards (id, employee_id, period_id) values (v_sc, v_aditya, '2026-09');
  insert into scorecard_metrics (scorecard_id, id, name, description, type, unit, direction, target, weight, actual, actual_source, source_config, sort_order, updated_at, updated_by) values
  (v_sc, 'f1feab89-1f2f-4ac4-bb90-ad1acfd9063b', 'Revenue reporting accuracy', 'Revenue reports matching finance close figures', 'automatic', '%', 'higher_is_better', 98, 30, null, null, '{"kind":"redash","query_id":null,"value_column":"value"}', 0, null, null),
  (v_sc, 'c27ce169-21fa-4c4e-9f9c-b4c5788e4eaa', 'Dashboards delivered', 'New dashboards signed off by the requesting team', 'manual', 'count', 'higher_is_better', 5, 25, 5, 'manual', null, 1, now(), null),
  (v_sc, 'e270fc16-df8f-4531-acf1-29944f559604', 'Request turnaround', 'Average days to close an ad-hoc data request', 'automatic', 'days', 'lower_is_better', 2, 20, null, null, '{"kind":"redash","query_id":null,"value_column":"value"}', 2, null, null),
  (v_sc, 'fe748a4e-d947-4574-afc0-82d9524f749a', 'Analysis reviews', 'Junior analyses reviewed before they go to stakeholders', 'manual', 'count', 'higher_is_better', 6, 25, null, null, null, 3, null, null);

  -- ---------- Dhanesh's scorecard ----------
  v_sc := '8b9bab41-5693-415c-8e0d-c3cb73e9acb7';
  insert into scorecards (id, employee_id, period_id) values (v_sc, v_dhanesh, '2026-09');
  insert into scorecard_metrics (scorecard_id, id, name, description, type, unit, direction, target, weight, actual, actual_source, source_config, sort_order, updated_at, updated_by) values
  (v_sc, '21200e96-9855-4f56-bfb1-c934ed1faa98', 'Report accuracy', 'Recurring reports shipped without a correction', 'automatic', '%', 'higher_is_better', 97, 30, null, null, '{"kind":"redash","query_id":null,"value_column":"value"}', 0, null, null),
  (v_sc, 'b6687b97-e090-4c75-afcb-1d4dd406071b', 'On-time report delivery', 'Recurring reports delivered by their scheduled time', 'manual', '%', 'higher_is_better', 95, 30, 88, 'manual', null, 1, now(), null),
  (v_sc, '49dfdb4b-149e-413a-afcf-6ad5ade18756', 'Request turnaround', 'Average days to close an ad-hoc data request', 'automatic', 'days', 'lower_is_better', 3, 20, null, null, '{"kind":"redash","query_id":null,"value_column":"value"}', 2, null, null),
  (v_sc, 'a94e8e69-94b4-45ed-a226-32e9535497ef', 'Learning milestones', 'Agreed courses or certifications completed', 'manual', 'count', 'higher_is_better', 2, 20, null, null, null, 3, null, null);

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
