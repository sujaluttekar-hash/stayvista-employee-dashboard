# Employee Dashboard — StayVista
## Handoff doc

---

## Version history

| Version | Date | What changed |
|---|---|---|
| v0.1 | 2026-09-15 | Initial scaffold: schema, RLS, auth, one live department page, Redash proxy stub, manager/HR/data role shells |

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

- [ ] Confirm: new Supabase project (separate from Butler Ops) — name + region?
- [ ] Confirm: GitHub repo name/org (`stayvista-employee-dashboard`?)
- [ ] Run `0001_init.sql` + `0002_seed_templates.sql` against the real project
- [ ] Get real Redash host + API key, test `/api/redash/sync` against one live query
- [ ] Confirm the row shape each department's Redash query needs to return (`employee_no, month, metric_key, actual`) with whoever owns each query
- [ ] Port Hearth's charts/leaderboard/scorecard-doc/reports into React components
- [ ] Wire HR's status-edit control (currently read-only)
- [ ] Port each metric's `actual -> band` scoring formula server-side (currently manager sets band manually; F&B's real formulas exist in the Hearth prototype and just need transcribing)
- [ ] Real KPIs/weights for the 11 placeholder departments — need each dept lead
- [ ] Seed real `people` + `profiles` rows (currently empty — schema only)
- [ ] Decide: self-service password reset / magic-link vs. HR-provisioned accounts only

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
