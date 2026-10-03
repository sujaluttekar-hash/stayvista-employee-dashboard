# Employee Dashboard — StayVista
## Handoff document · current version **v0.6.1** (3 Oct 2026)

Keep this file current. Every change to the app adds a row to the version history and updates the sections it touches.

---

## Version history

| Version | Date | What changed |
|---|---|---|
| **v0.6.1** | 2026-10-03 | **Hotfix:** middleware could crash the whole site with Vercel's "500 MIDDLEWARE_INVOCATION_FAILED" (e.g. when a deployment had no Supabase settings). It now never throws: missing settings or an unreachable database send people to the login page with a plain message, still without letting anyone in. |
| **v0.6** | 2026-10-03 | **Security:** removed the hardcoded fallback login (it was also bypassable with a cookie). Only emails registered under Management → Logins can get in, checked at the front door (middleware), at sign-in and on every page. **Monthly scorecards everywhere:** month switcher on Overview, Department, Management, Employee and Data sources pages; non-monthly periods ignored; the app adds the next months by itself (it used to run out after Dec 2026). **Sync rewritten:** one Redash call per query (was one per person per metric), tolerant month/employee matching, partial failures reported instead of aborting, unchanged values skipped. **Removed** the "Preview mode" banner, "Reset preview data" and "Fill with demo values". **Bug fixes:** see "Bugs fixed in v0.6". Migration 0003 now refuses to run on a database that has data; new safe migration 0005. |
| v0.5 | 2026-09-28 → 10-01 | *(reconstructed from the commit log; the handoff was not updated at the time)* Supabase brought back as the real database. Real sign-in with Supabase Auth; Management → Logins creates them. All writes go to Supabase. The real 50 StayVista departments replace the demo ones; designation is a dropdown. BI team seeded (migration 0004). Monthly review periods introduced. Several fixes for employee-number clashes and a login redirect loop; a temporary hardcoded login was added for debugging. |
| v0.4 | 2026-09-23 | Three role logins (HR / Manager / Data team); employees are data only. Management tab. Department "Add employee" dropdown and department-wide "Add metric". |
| v0.3 | 2026-09-23 | Employees section, L1/L2 hierarchy, per-employee scorecards, server-side permissions, audit log, Data sources page. |
| v0.2 | 2026-09-23 | Supabase removed temporarily: preview mode with sample data. |
| v0.1 | 2026-09-15 | Initial scaffold: schema, RLS, auth, Redash proxy stub. |

---

## What this is

A monthly scorecard system. Each employee has one scorecard per **calendar month**, made of weighted metrics. A metric is either **manual** (a manager types the actual) or **automatic** (the Data team syncs it from Redash). Overall score = weighted achievement across the metrics that have data.

Stack: Next.js 14 (App Router) · Supabase (Postgres + Auth) · Vercel · Redash for automatic metrics.

## How it is put together

```
src/middleware.ts            ← front door: must be signed in AND registered in app_users
src/lib/auth/session.ts      ← who is signed in → Viewer {role}
src/lib/auth/permissions.ts  ← EVERY access rule, nowhere else
src/lib/data/store.ts        ← EVERY read/write. hydrateStore() loads from Supabase (once per request)
src/lib/periods.ts           ← months, India time, "current month"
src/lib/scoring.ts           ← score / weighted / status / overall
src/lib/sources/index.ts     ← Redash sync matching (one query = one call)
src/lib/redash.ts            ← Redash HTTP client
src/app/actions.ts           ← all writes: auth → permission → validate → write → audit
src/components/period-switcher.tsx  ← the ‹ month › control
supabase/migrations/         ← database history (see "Database" below)
```

**Rule for new pages:** call `await requireViewer()` then `await hydrateStore()` before touching `db.*`. A layout and its page render at the same time, so a page must never assume the layout loaded the data.

## Who can do what

| | HR | Manager | Data team |
|---|---|---|---|
| View every department and scorecard | Yes | Yes | Yes |
| Management tab: logins, add/remove employees, departments, L1/L2 | Yes | No | Yes |
| Add metrics, edit targets / actuals / weights | No | Yes | Yes |
| Data sources and Redash sync | No | No | Yes |

**Access:** the only way in is an email added under **Management → Logins**. That creates the Supabase sign-in *and* the `app_users` row. Without the row, a person is turned away at the middleware, at the login form, and by `getViewer()`.

## Monthly scorecards

- A period id is `YYYY-MM` (e.g. `2026-10`). Anything else in `review_periods` (old quarters) is ignored.
- "Current month" uses **India time**, not UTC.
- The app adds the current month and the next 3 on its own. Migration 0005 also pre-fills through Dec 2028.
- "Start scorecard" copies the metric set from the closest earlier month, with actuals cleared.

## Redash sync (Data team → Data sources)

Per automatic metric, set `source_config.query_id` (and `value_column` if not `value`). The query must return **one row per employee per month**:

| Column | Example | Notes |
|---|---|---|
| `employee_no` | `EMP-004` | case and spaces ignored |
| `period_id` | `2026-10` | `period` or `month` also accepted; any date in the month works |
| `value` | `82.5` | or the column named in `value_column` |

Behaviour: each query runs once per sync and is shared; people with status exit/resigned are skipped; unchanged values are not rewritten; anything that can't sync is listed with a reason and count, and doesn't stop the rest. A sync can take up to a minute (page limit is set to 60 s; see Risks for hosting-plan limits).

**Not yet proven against your real Redash.** Needs `REDASH_BASE_URL`, `REDASH_API_KEY` and one real query.

---

## Security checklist

- [ ] **Make the GitHub repo private.** It was public. (GitHub → Settings → General → Danger zone)
- [ ] **Change the password of the account that was hardcoded** (the Data-team login). It stays readable in git history forever; treat it as exposed. Also change it anywhere else it was used.
- [ ] **Revoke the GitHub token that was shared in chat** and issue a fine-grained, short-lived one when needed.
- [ ] **Supabase → Authentication → Sign In / Providers → turn OFF "Allow new users to sign up".** The code also blocks unregistered accounts, but this is the second lock.
- [ ] **Every Vercel environment you deploy to (Production AND Preview) needs `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SERVICE_ROLE_KEY`.** Vercel → Settings → Environment Variables → tick the right environments, then redeploy (the `NEXT_PUBLIC_` ones are baked in at build time, so a redeploy is required).
- [ ] Confirm `SUPABASE_SERVICE_ROLE_KEY` exists only in Vercel environment variables (never committed; `.env` files are git-ignored).
- [ ] Run `supabase/bootstrap_first_login.sql` **if nobody has a row in `app_users` yet** (see below), otherwise nobody can sign in now that the fallback is gone.

## Database

Run in the Supabase SQL editor, in order. Already-applied ones are not re-run.

| File | Purpose | Status |
|---|---|---|
| 0001_init.sql | old v1 model | superseded by 0003 |
| 0002_seed_templates.sql | old v1 templates | superseded by 0003 |
| 0003_v2_reconcile.sql | current schema. **Drops tables.** Now refuses to run if employees exist. | applied |
| 0004_seed_bi_team.sql | BI team sample scorecards | applied |
| **0005_monthly_periods_and_cleanup.sql** | adds months to 2028, removes unused non-monthly periods, fixes wording. Safe to re-run. | **to run** |
| bootstrap_first_login.sql | one-off: give the first person access. Manual, not a migration. | **to run only if needed** |

Never edit an applied migration to change the database; add a new numbered one.

## Bugs fixed in v0.6

| Bug | Effect | Fix |
|---|---|---|
| Hardcoded login + unsigned cookie bypass | Anyone could skip login | Removed; allow-list enforced in 3 places |
| Pages loaded data before it was ready | Stale or sample data shown, "added but disappeared" | Each page loads its own data; sample-data fallback removed |
| Current month computed in UTC | Wrong month until 5:30 am IST on the 1st | India time |
| No periods after Dec 2026; fallback to January | App would jump to January 2027 | Auto-extends; falls back to latest month |
| Month could only be switched on the employee page | Couldn't view past months elsewhere | Switcher on all pages |
| Sync re-ran the same Redash query per person per metric | Very slow, timeouts, API load | One call per query, parallel |
| Sync stopped at first failure; strict period matching | Syncs "did nothing" with no reason | Per-metric reasons; tolerant matching |
| "Reset preview" on a live database | Button did nothing real / misleading | Removed |
| "Fill with demo values" on real scorecards | Could pollute real reviews | Removed (clearing leftovers still possible) |
| Lower-is-better metric with target 0 never scored | e.g. "0 complaints" showed "Awaiting" | Scores 100 at/under target |
| Start scorecard copied from "last in list" | Could copy the wrong month's metrics | Copies nearest earlier month |
| Department-wide metric added twice on re-click | Duplicate metrics | Skips people who already have it |
| `EMP_001` matched `EMP-001` | False "number in use" | Wildcards escaped |
| Logins list cut at 50 people; email case; orphan accounts | Missing emails; "already registered" dead-end | Paged; normalised; orphans reused |
| Raw database errors shown to users | Internal details leaked | Plain message; detail in server log |
| Migration 0003 wipes data if re-run | Total data loss | Safety stop at the top |

## Tested in v0.6

- [x] TypeScript compile and production build pass
- [x] 25 logic checks pass: months and India time, year roll-over, leap February, scoring edge cases, Redash matching (padded/lower-case numbers, timestamps, "1,250"), one-call-per-query, no-access handling
- [ ] **Not tested against the live Supabase project, Redash or Vercel.** After deploying: sign in with a registered email; try an unregistered one (should be refused); add a login in Management and sign in with it; switch months on every page; run a sync.

## Risks and limits

- **Hosting plan:** a sync can exceed 10 s. If syncs time out on your Vercel plan, raise the plan limit or split the sync by department.
- **One shared Manager login** can edit every department; per-manager scoping needs one login per manager plus a rule change in `permissions.ts`.
- The in-memory copy of data is shared by concurrent requests on one server instance. Fine for HR-scale traffic; revisit if usage grows a lot.
- HR cannot edit scores by design (flip `canEditScores` to change).

## Pending checklist

**Do first (security)**
- [ ] Repo to private · [ ] change exposed password · [ ] revoke shared token · [ ] sign-ups off in Supabase · [ ] bootstrap login if needed

**Deploy and verify**
- [ ] Run migration 0005
- [ ] Deploy to Vercel; walk through the last item of "Tested in v0.6"
- [ ] Add real logins in Management for HR and managers

**Business decisions**
- [ ] Real KPIs, weights, targets per department (50 departments, most still placeholders)
- [ ] Confirm scoring (capped linear vs banding) · [ ] confirm HR cannot edit scores
- [ ] Per-manager logins, yes or no

**Build**
- [ ] Link Redash query IDs to automatic metrics; confirm column shape with query owners
- [ ] Admin screen to set a metric's query ID (today it's set in data)
- [ ] Port charts / leaderboard / reports from the earlier prototype
- [ ] Remove unused sample-data file `src/lib/data/seed.ts` (only `STORE_VERSION` is still used)

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in Supabase (+ Redash) values
npm run dev
```
