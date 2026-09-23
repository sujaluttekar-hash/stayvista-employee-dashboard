# Employee Dashboard — StayVista
## Handoff doc

---

## Version history

| Version | Date | What changed |
|---|---|---|
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

**Roles.** Only `is_admin` is stored. "Manager" is derived — anyone with at least one direct report — so it can't drift from the org chart.

| | Admin | Manager | Employee |
|---|---|---|---|
| See all departments / employees | Yes | No | No |
| See own scorecard | Yes | Yes | Yes |
| See direct reports' scorecards | Yes (everyone) | Yes (L1 reports only) | No |
| Edit a scorecard | Any | Direct reports only | Never, including own |
| Add employee, assign L1/L2, edit details | Yes | No | No |
| Run data sync, demo values, reset | Yes | No | No |

A person the viewer can't see returns "not found" (not "forbidden") so nobody can discover who exists.

**Decisions made (change if wrong)**
- L2 managers get **no** visibility of skip-level reports. The spec says "directly report"; flip one line in `canViewEmployee` if L2 should see them.
- Nobody edits their own metrics, including managers. An admin edits the admin's own scorecard.
- Score = achievement vs target, **capped at 100**, linear. Lower-is-better metrics invert. Overall = weighted average of metrics **that have data**; coverage % is shown next to it.
- Status bands: ≥100 Achieved, ≥90 On track, ≥70 In progress, below Behind. Empty manual = Not started, empty automatic = Awaiting data.
- Review cycle is quarterly (Jul–Sep 2026, Oct–Dec 2026). A new period's scorecard copies the last one's metrics with actuals cleared.
- Hierarchy is proposed for testing: Head of Data (sample) → Ronak → Sujal, Aditya; Aditya → Dhanesh. Designations and targets are placeholders.

**Automatic metrics.** They start empty. A live sync only fills metrics that have `source_config.query_id` set and Redash credentials on the server. The query must return `employee_no, period_id, value`. Demo values exist only when an admin clicks "Fill with demo values", are stored as `actual_source = 'demo'`, and are tagged "Demo" everywhere.

**Preview storage.** JSON file at `.data/preview-store.json` (gitignored), or `/tmp` on Vercel. On Vercel it can reset at any time. Fine for testing, not for real reviews.

**Tested (v0.3).** 45-cell page-access matrix (5 people × 9 pages) matches the table above. Direct server requests bypassing the UI: an employee editing their own metrics, a peer, and a report editing their manager are all rejected; the L1 manager's edit is saved and audited; a reporting loop is rejected; a manager reassigning managers is rejected; reassigning Dhanesh moves access immediately.

---

## Bringing Supabase back

`supabase/schema-v2-draft.sql` is the target schema with RLS that mirrors `permissions.ts`. Steps:
1. Reconcile with `0001_init.sql` (v2 replaces `people`/`profiles`/`scores`), then turn the draft into migration `0003`.
2. Re-implement the functions in `src/lib/data/store.ts` with Supabase queries — same names, same return types.
3. In `src/lib/auth/session.ts`, replace the cookie lookup with `supabase.auth.getUser()` → `app_users`.
4. Replace the login picker with email/magic-link sign-in.
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
- [ ] Confirm L2 managers should NOT see skip-level scorecards
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
