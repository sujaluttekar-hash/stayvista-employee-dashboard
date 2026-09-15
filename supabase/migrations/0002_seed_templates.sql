-- ============================================================
-- Seed: one scorecard_template per department.
-- F&B carries the real metrics ported from the Hearth prototype.
-- The other 11 are marked is_placeholder = true — visible in the UI
-- with a banner ("KPIs pending sign-off from dept lead") so nobody
-- mistakes a placeholder weight for a real target.
-- ============================================================

do $$
declare
  v_dept_id uuid;
  v_tpl_id uuid;
begin

  -- ---------- F&B — real metrics, ported 1:1 from Hearth ----------
  select id into v_dept_id from departments where slug = 'fnb';
  insert into scorecard_templates (department_id) values (v_dept_id) returning id into v_tpl_id;

  insert into scorecard_metrics (template_id, key, name, definition, weight, target, unit, lower_is_better, bands, sort_order) values
  (v_tpl_id, 'avgfeedback', 'Average feedback', 'Mean guest rating across converted stays.', .20, '4.75', '', false, '["≤2","2–3","3–4.75","4.75–4.8","4.8–5"]', 1),
  (v_tpl_id, 'refund',      'Refunds',          'Refund count raised against squad. Fewer is better.', .20, '2', '', true,  '["≤5","≤3","≤2","≤1","0"]', 2),
  (v_tpl_id, 'audits',      'Audits',           'Property audits completed in the month.', .10, '48', '', false, '["≤16","≤32","≤48","≤64","≤80"]', 3),
  (v_tpl_id, 'closure',     'Monthly closure',  'Month-end closure completion %.', .10, '75%', '%', false, '["≤25","≤50","≤75","≤100","≤125"]', 4),
  (v_tpl_id, 'adoption2',   'Adoption',         'Uptake of operating process across squad.', .20, '70%', '%', false, '["≤23","≤47","≤70","≤93","≤100"]', 5),
  (v_tpl_id, 'trainings',   'Trainings',        'Training sessions delivered in the month.', .20, '3', '', false, '["≤1","≤2","≤3","≤4","≤5"]', 6);

  -- ---------- Chef (second F&B template — chef-specific KRAs) ----------
  insert into scorecard_templates (department_id) values (v_dept_id) returning id into v_tpl_id;
  insert into scorecard_metrics (template_id, key, name, definition, weight, target, unit, lower_is_better, bands, sort_order) values
  (v_tpl_id, 'training',  'Training participation', 'Share of eligible staff who completed required training.', .20, '75%', '%', false, '["0–50%","51–74%","75%","76–99%","100%"]', 1),
  (v_tpl_id, 'fivestar',  '5-star volume', 'Share of converted stays rated 5 stars.', .20, '85%', '%', false, '["1–50","51–84","85","86–99","100"]', 2),
  (v_tpl_id, 'lowrating', 'Low-rating issues', 'Share of converted stays rated 3 or below. Lower is better.', .20, '5%', '%', true, '[">10%","10–6%","5%","4–3%","<3%"]', 3),
  (v_tpl_id, 'feedback',  'Feedback collection', 'Share of converted stays that returned a rating.', .20, '70%', '%', false, '["0–50%","51–69%","70%","71–89%","90–100%"]', 4),
  (v_tpl_id, 'adoption',  'Adoption rate', 'Active users meeting the process threshold vs total targets.', .20, '85%', '%', false, '["0–60%","61–84%","85%","86–90%","91–100%"]', 5);

  -- ---------- 11 new departments — placeholder templates ----------
  -- Each gets ONE generic placeholder metric at 100% weight so the schema
  -- is valid and the UI renders, clearly marked as not-yet-real.
  for v_dept_id in
    select id from departments where slug != 'fnb'
  loop
    insert into scorecard_templates (department_id) values (v_dept_id) returning id into v_tpl_id;
    insert into scorecard_metrics (template_id, key, name, definition, weight, target, unit, is_placeholder, bands, sort_order) values
    (v_tpl_id, 'placeholder_1', 'Metric pending', 'Awaiting KPI definition from department lead.', 1.0, 'TBD', '', true, '["TBD","TBD","TBD","TBD","TBD"]', 1);
  end loop;

end $$;
