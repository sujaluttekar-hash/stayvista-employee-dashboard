-- ============================================================
-- 0005 — monthly review periods + tidy-up.  SAFE TO RE-RUN.
-- It only ADDS months and fixes wording. It never drops tables
-- and never touches employees, scorecards or scores.
-- (The app also adds the current and next 3 months by itself;
--  this just fills the calendar ahead of time.)
-- ============================================================

-- 1. Every month from Jan 2026 to Dec 2028 (existing months are left alone).
insert into review_periods (id, label, starts, ends)
select to_char(d, 'YYYY-MM'),
       to_char(d, 'FMMonth YYYY'),
       d::date,
       ((d + interval '1 month') - interval '1 day')::date
from generate_series('2026-01-01'::date, '2028-12-01'::date, interval '1 month') as d
on conflict (id) do nothing;

-- 2. Remove any non-monthly period (e.g. an old quarter) ONLY if no
--    scorecard uses it. The app ignores non-monthly rows either way.
delete from review_periods p
where p.id !~ '^\d{4}-\d{2}$'
  and not exists (select 1 from scorecards s where s.period_id = p.id);

-- 3. Wording: scorecards are monthly, not quarterly.
update scorecard_metrics
set description = replace(description, 'Quarterly survey score', 'Monthly survey score')
where description like 'Quarterly survey score%';
