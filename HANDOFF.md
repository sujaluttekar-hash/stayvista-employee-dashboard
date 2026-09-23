# Employee Dashboard — StayVista
## Handoff doc

---

## Version history

| Version | Date | What changed |
|---|---|---|
| v0.4 | 2026-09-23 | Logins reduced to 3 roles (HR, Manager, Data team); employees are data only. New Management tab (HR + Data) to add/remove employees and set department. Every department page: "Add employee" dropdown from the employee list, and "Add metric to everyone in this department". Overview page of all departments. Manager's team-only view removed (one Manager login can't be scoped to a team). |
| v0.3 | 2026-09-23 | Employees section, L1/L2 manager hierarchy with admin "Assign managers", per-employee scorecards (manual vs automatic metrics, target/actual/weight/score/weighted/status/period/last updated/by), Manager view (self + direct reports only), Admin/Manager/Employee permissions enforced server-side, audit log, Data sources page (Redash connector + clearly-tagged demo values), BI / Data team seeded. |
| v0.2 | 2026-09-23 | Supabase removed for now. Preview mode: sample data, demo role picker on login (cookie session). |
| v0.1 | 2026-09-15 | Initial scaffold: schema, RLS, auth, one live department page, Redash proxy stub, manager/HR/data role shells |

---

## How v0.3 is put together

```
src/lib/data/types.ts        ← data model (maps 1:1 to future Supabase tables)
src/lib/data/seed.ts         ← preview sample data (BI team + hierarchy)
src/lib/data/store.ts        ← repository: EVERY read/write goes through here
src/lib/auth/session.ts      ← who is signed in → Viewer {isAdmin, isManager}
src/lib/auth/permissions.ts  ← EVERY access rule lives here, nowhere else
src/lib/scoring.ts           ← score / weighted / status / overall formulas
src/lib/sources/index.ts     ← automatic-metric connectors (Redash, demo)
src/app/actions.ts           ← all writes: auth → permission → validate → write → audit
```

**Logins.** Exactly three: HR, Manager, Data team. Employees (Ronak, Sujal, Aditya, Dhanesh, plus anyone added) are records, not logins.

| | HR | Manager | Data team |
|---|---|---|---|
| View every department and scorecard | Yes | Yes | Yes |
| Management tab: add / remove employees, set department, L1 / L2, designation | Yes | No | Yes |
| Department page: "Add employee" dropdown, "Remove from department" | Yes | No | Yes |
| Add metrics (department-wide or per person), edit targets / actuals / weights | No | Yes | Yes |
| Data sources, demo values, reset preview | No | No | Yes |

All rules live in `src/lib/auth/permissions.ts` (three one-line functions) and are enforced on the server for every action.

**Decisions made (change if wrong)**
- HR can't edit scores. This keeps the v0.1 rule "HR changes status, managers own scores". Flip `canEditScores` to add HR.
- The single Manager login sees and edits every department. With one shared Manager login, there's no way to limit it to one team. Per-manager scoping needs one login per manager, which comes with Supabase sign-in.
- L1 / L2 managers are chosen from the employee list and shown on each scorecard. They're informational for now and don't control access.
- "Add metric" on a department page adds that metric to every employee in the department for the selected period. To add a metric to one person, use their scorecard.
- Deleting an employee also deletes their scorecards and clears them as anyone's L1 / L2 (the app says who was affected). "Remove from department" only unassigns them and keeps their scorecard.
- Employee number is auto-generated (EMP-00X) if left blank.
- Score = achievement vs target, capped at 100, linear. Overall = weighted average of metrics that have data; coverage % is shown beside it.
- Status bands: ≥100 Achieved, ≥90 On track, ≥70 In progress, below that Behind.
- Review cycle is quarterly.
- Seed hierarchy: Ronak → Sujal, Aditya; Aditya → Dhanesh (L2 Ronak). Designations and targets are placeholders.

**Automatic metrics.** They start empty. A live sync only fills metrics that have `source_config.query_id` set and Redash credentials on the server. The query must return `employee_no, period_id, value`. Demo values exist only when an admin clicks "Fill with demo values", are stored as `actual_source = 'demo'`, and are tagged "Demo" everywhere.

**Preview storage.** JSON file at `.data/preview-store.json` (gitignored), or `/tmp` on Vercel. On Vercel it can reset at any time. Fine for testing, not for real reviews.

**Tested (v0.4).** 3 logins × 5 pages access check. Server-side, bypassing the UI: HR adds an employee to F&B (ok), Manager adds an employee (blocked), Data moves Dhanesh into F&B via the dropdown (ok), Manager adds a department metric to 2 scorecards (ok), HR adds a metric (blocked), Manager deletes an employee (blocked), HR deletes Aditya (ok; Dhanesh flagged as having no L1), HR assigns managers (ok). Old per-employee logins are rejected.

---

## Bringing Supabase back

`supabase/schema-v2-draft.sql` is the target schema with RLS that mirrors `permissions.ts`. Steps:
1. Reconcile with `0001_init.sql` (v2 replaces `people`/`profiles`/`scores`), then turn the draft into migration `0003`.
2. Re-implement the functions in `src/lib/data/store.ts` with Supabase queries — same names, same return types.
3. In `src/lib/auth/session.ts`, replace the cookie lookup with `supabase.auth.getUser()` → `app_users`.
4. Replace the login picker with email/magic-link sign-in; map each account to a role in `app_users`.
5. Keep `permissions.ts` checks in server actions even with RLS on. Two layers on purpose.

Pages and components should need no changes.

---

## What's real vs. stubbed right now

| Piece | Status |
|---|---|
| Supabase schema + RLS (roles, departments, people, scores) | ✅ Built — `supabase/migrations/0001_init.sql` |
| F&B + Chef scorecard metrics | ✅ Real — ported 1:1 from the Hearth prototype |
| 11 other departments | ⚠️ Placeholder templates (1 dummy metric each), banner shown in UI |
| Login (email/password) | ✅ Built |
| Role-based route gating (Manager/HR/Data) | ✅ Built (middleware + RLS, two layers) |
| Manager "my team" score editing | ✅ Built, but band-scoring formula is manual entry — not yet auto-computed from `actual` per metric |
| HR roster view | ✅ Read-only view built; status-edit control not wired yet |
| Redash live sync | ✅ Proxy route built; **not tested against a real Redash instance** — needs `REDASH_BASE_URL`/`REDASH_API_KEY` and one real query to validate the row shape |
| Charts, leaderboard, drawer, reports (from Hearth) | ❌ Not ported yet — department page currently just shows roster + metric columns |
| Actual Supabase project / GitHub repo / Vercel deploy | ❌ Not provisioned — this is local code only until you confirm |

---

## Pending checklist

**Decisions for the business**
- [ ] Confirm the BI hierarchy (who is Ronak's L1, and does Dhanesh report to Aditya or Ronak?)
- [ ] Confirm HR should not edit scores
- [ ] Decide if managers should later get their own logins scoped to their team
- [ ] Sign off BI metrics, targets and weights (current ones are proposals)
- [ ] Confirm scoring: capped-at-100 linear vs HR banding (1–5)
- [ ] Confirm review cycle: quarterly vs monthly
- [ ] Real KPIs/weights for the other 12 departments (each dept lead)

**Build**
- [ ] Hosting decision (see chat) and first deploy
- [ ] Link Redash query IDs to the automatic BI metrics; confirm `employee_no, period_id, value` shape with query owners
- [ ] Admin UI to edit a metric's Redash query ID (today it's in data only)
- [ ] Bring Supabase back (steps above) — needed before real reviews
- [ ] Real sign-in (magic link vs HR-provisioned)
- [ ] Port Hearth charts / leaderboard / reports
- [ ] Transcribe F&B formulas from the Hearth prototype

---

## Architecture notes for whoever picks this up

- **Permission model is two-layered on purpose.** `middleware.ts` stops the wrong role from even loading a page shell (e.g. a manager hitting `/hr/roster`). The actual data scoping — a manager only seeing their own reports — is enforced in Postgres via RLS policies, not in React. Don't trust the UI to hide something a determined user could still query for; the DB is the real gate.
- **Redash sync writes with the service-role key**, bypassing RLS entirely, so it's not subject to "manager can only write own team." That's intentional — it's an org-wide feed. Every write is logged to `redash_sync_log` for audit, and stamped `source='redash'` so you can always tell a synced value from a manager's manual override.
- **HR can change `people.status` but never `scores`.** That boundary is enforced by policy, not convention.
- **department accent colours** (Bloom/Sky/Shine) in `lib/departments.ts` are purely visual grouping — no permission meaning, don't read anything into them.

---

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in Supabase + Redash values
npm run dev
```

Migrations live in `supabase/migrations/` — run them via the Supabase SQL editor or CLI once the project exists.
