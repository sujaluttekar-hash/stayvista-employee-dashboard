-- ============================================================
-- 0006 — "Rated 1-5" scoring.  SAFE TO RE-RUN. Only ADDS two columns.
--
-- Some scorecards (e.g. the F&B Ops FY27 sheet) are scored the way the
-- sheet does it: a manager gives each metric a score from 1 to 5, and the
-- scorecard total is the weighted average out of 5.
--   scoring = 'linear' (default): score calculated from actual vs target, 0-100
--   scoring = 'rated'           : score is the 0-5 rating typed in (rating)
-- Existing metrics are untouched and stay 'linear'.
-- ============================================================
alter table scorecard_metrics
  add column if not exists scoring text not null default 'linear' check (scoring in ('linear','rated'));
alter table scorecard_metrics
  add column if not exists rating numeric check (rating between 0 and 5);
