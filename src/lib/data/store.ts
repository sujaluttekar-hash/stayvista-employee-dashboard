import "server-only";
// ─────────────────────────────────────────────────────────────────────
// Reads: still the local JSON/in-memory store (fast, synchronous — every
// page in the app calls db.* without awaiting).
//
// Writes: every writes.* function below mutates the local store AND
// writes the same change to the real Supabase tables (departments,
// employees, app_users, scorecards, scorecard_metrics, audit_log),
// using the service-role key so it isn't blocked by RLS — the caller's
// role has already been checked in src/app/actions.ts before any
// writes.* function runs. If the Supabase write fails, the whole action
// fails (the local change is NOT kept), so the two stores can't drift
// apart silently.
// ─────────────────────────────────────────────────────────────────────
import { cache } from "react";
import type { Store, Employee, ScorecardMetric, AuditEntry, Scorecard } from "./types";
import { STORE_VERSION } from "./seed";
import { createAdminClient } from "@/lib/supabase/server";
import { isMonthly, monthIdOf, monthPeriod, shiftMonth, todayInIndia } from "@/lib/periods";

function sb() {
  return createAdminClient();
}
function must<T>(label: string, result: { data: T; error: any }): T {
  if (result.error) throw new Error(`Supabase write failed (${label}): ${result.error.message}`);
  return result.data;
}

let memory: Store | null = null;

// Supabase is the real source of truth. `memory` is a per-request cache
// of it. hydrateStore() fetches everything fresh. It is memoised PER
// REQUEST (React cache), so every page, layout and server action can
// simply `await hydrateStore()` first without paying for it twice.
//
// IMPORTANT: Next.js renders a layout and its page at the same time, so a
// page must not rely on the layout having hydrated. Every page and every
// action calls hydrateStore() itself before touching db.*.
export const hydrateStore = cache(async (): Promise<void> => {
  const [dep, emp, usr, per, sc, met, aud] = await Promise.all([
    sb().from("departments").select("*"),
    sb().from("employees").select("*"),
    sb().from("app_users").select("*"),
    sb().from("review_periods").select("*").order("starts"),
    sb().from("scorecards").select("*"),
    sb().from("scorecard_metrics").select("*"),
    sb().from("audit_log").select("*").order("at", { ascending: false }).limit(500),
  ]);
  for (const [label, r] of [["departments", dep], ["employees", emp], ["app_users", usr], ["review_periods", per], ["scorecards", sc], ["scorecard_metrics", met], ["audit_log", aud]] as const) {
    if (r.error) throw new Error(`Supabase read failed (${label}): ${r.error.message}`);
  }

  // Scorecards are monthly. Ignore any non-monthly rows (e.g. old quarters)…
  let periods = (per.data as Store["periods"]).filter(isMonthly);
  // …and make sure this month and the next few always exist, so the app
  // never runs out of months (it used to stop at December 2026).
  const have = new Set(periods.map((p) => p.id));
  const thisMonth = monthIdOf(todayInIndia());
  const missing = [0, 1, 2, 3].map((n) => shiftMonth(thisMonth, n)).filter((id) => !have.has(id)).map(monthPeriod);
  if (missing.length) {
    const { error } = await sb().from("review_periods").upsert(missing, { onConflict: "id", ignoreDuplicates: true });
    if (error) console.error("Could not extend review_periods:", error.message);
    periods = [...periods, ...missing].sort((a, b) => a.starts.localeCompare(b.starts));
  }

  memory = {
    version: STORE_VERSION,
    departments: dep.data as Store["departments"],
    employees: emp.data as Store["employees"],
    users: (usr.data as any[]).map((u) => ({ id: u.id, display_name: u.display_name, role: u.role })),
    periods,
    scorecards: sc.data as Store["scorecards"],
    metrics: met.data as Store["metrics"],
    audit: (aud.data as any[]).map((a) => ({ id: a.id, at: a.at, actor_id: a.actor_id, action: a.action, entity_id: a.entity_id, summary: a.summary })),
  };
});

function read(): Store {
  if (memory && memory.version === STORE_VERSION) return memory;
  // Never fall back to sample data: showing made-up numbers as if they were
  // real is worse than an error. Every caller must hydrateStore() first.
  throw new Error("Data was read before it was loaded (hydrateStore() was not called first)");
}

function write(s: Store) {
  memory = s;
}

function mutate<T>(fn: (s: Store) => T): T {
  const s = read();
  const result = fn(s);
  write(s);
  return result;
}

const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// ── Reads ────────────────────────────────────────────────────────────
export const db = {
  departments: () => read().departments,
  department: (id: string | null | undefined) => (id ? read().departments.find((d) => d.id === id) ?? null : null),
  departmentBySlug: (slug: string) => read().departments.find((d) => d.slug === slug) ?? null,
  employees: () => [...read().employees].sort((a, b) => a.name.localeCompare(b.name)),
  employee: (id: string | null | undefined) => (id ? read().employees.find((e) => e.id === id) ?? null : null),
  directReports: (managerId: string) => db.employees().filter((e) => e.l1_manager_id === managerId),
  users: () => read().users,
  user: (id: string | undefined) => read().users.find((u) => u.id === id) ?? null,
  employeesIn: (departmentId: string) => db.employees().filter((e) => e.department_id === departmentId),
  periods: () => read().periods,
  scorecard: (employeeId: string, periodId: string) =>
    read().scorecards.find((s) => s.employee_id === employeeId && s.period_id === periodId) ?? null,
  scorecards: () => read().scorecards,
  metrics: (scorecardId: string) =>
    read().metrics.filter((m) => m.scorecard_id === scorecardId).sort((a, b) => a.sort_order - b.sort_order),
  metric: (id: string) => read().metrics.find((m) => m.id === id) ?? null,
  scorecardById: (id: string) => read().scorecards.find((s) => s.id === id) ?? null,
  // Checked against Supabase directly, not the local store -- on Vercel
  // the local store is per-instance and can reset or fall out of sync,
  // so it doesn't reliably reflect every employee that's actually been
  // added (this was the cause of duplicate employee_no errors).
  employeeNoTaken: async (no: string): Promise<boolean> => {
    // ilike is case-insensitive but treats % and _ as wildcards: escape them
    // so "EMP_001" can't be mistaken for "EMP-001".
    const exact = no.trim().replace(/[\\%_]/g, (c) => `\\${c}`);
    const { data, error } = await sb().from("employees").select("id").ilike("employee_no", exact).limit(1);
    if (error) throw new Error(`Supabase read failed (employees): ${error.message}`);
    return !!data && data.length > 0;
  },
  nextEmployeeNo: async (): Promise<string> => {
    const { count } = await sb().from("employees").select("id", { count: "exact", head: true });
    let n = (count ?? 0) + 1;
    let no = `EMP-${String(n).padStart(3, "0")}`;
    while (await db.employeeNoTaken(no)) { n++; no = `EMP-${String(n).padStart(3, "0")}`; }
    return no;
  },
  audit: (entityIds: string[], limit = 15) =>
    read().audit.filter((a) => entityIds.includes(a.entity_id)).slice(0, limit),
};

// ── Writes ───────────────────────────────────────────────────────────
function log(s: Store, entry: Omit<AuditEntry, "id" | "at">) {
  s.audit.unshift({ ...entry, id: uid("a"), at: new Date().toISOString() });
  s.audit = s.audit.slice(0, 500);
}

export const writes = {
  async updateEmployee(actorId: string, id: string, patch: Partial<Omit<Employee, "id">>, summary: string) {
    await must("employees.update", await sb().from("employees").update(patch).eq("id", id));
    await must("audit_log.insert", await sb().from("audit_log").insert({ actor_id: safeActor(actorId), action: "employee.update", entity_id: id, summary }));
    return mutate((s) => {
      const e = s.employees.find((x) => x.id === id);
      if (!e) throw new Error("Employee not found");
      Object.assign(e, patch);
      log(s, { actor_id: actorId, action: "employee.update", entity_id: id, summary });
      return e;
    });
  },

  async addEmployee(actorId: string, data: Omit<Employee, "id">) {
    // Belt-and-suspenders: even after checking employeeNoTaken() up front,
    // retry with a fresh number if a concurrent add slipped in between
    // the check and this insert (Postgres unique_violation = code 23505).
    let attempt = { ...data };
    let result = await sb().from("employees").insert(attempt).select().single();
    let tries = 0;
    while (result.error?.code === "23505" && tries < 5) {
      attempt = { ...attempt, employee_no: await db.nextEmployeeNo() };
      result = await sb().from("employees").insert(attempt).select().single();
      tries++;
    }
    const row = must("employees.insert", result);
    await must("audit_log.insert", await sb().from("audit_log").insert({ actor_id: safeActor(actorId), action: "employee.create", entity_id: row.id, summary: `Added ${row.name}` }));
    return mutate((s) => {
      const e: Employee = { ...attempt, id: row.id };
      s.employees.push(e);
      log(s, { actor_id: actorId, action: "employee.create", entity_id: e.id, summary: `Added ${e.name}` });
      return e;
    });
  },

  // Removes the employee, their scorecards/metrics, and clears them as anyone's manager.
  async removeEmployee(actorId: string, id: string) {
    const existing = mutate((s) => s.employees.find((x) => x.id === id));
    if (!existing) return null;
    // scorecards/scorecard_metrics cascade-delete via FK; the two manager
    // columns are ON DELETE SET NULL, so those clear themselves too.
    await must("employees.delete", await sb().from("employees").delete().eq("id", id));
    await must("audit_log.insert", await sb().from("audit_log").insert({ actor_id: safeActor(actorId), action: "employee.delete", entity_id: id, summary: `Removed ${existing.name}` }));
    return mutate((s) => {
      const e = s.employees.find((x) => x.id === id);
      if (!e) return null;
      const scIds = new Set(s.scorecards.filter((x) => x.employee_id === id).map((x) => x.id));
      s.metrics = s.metrics.filter((m) => !scIds.has(m.scorecard_id));
      s.scorecards = s.scorecards.filter((x) => !scIds.has(x.id));
      s.employees = s.employees.filter((x) => x.id !== id);
      const orphaned: string[] = [];
      for (const x of s.employees) {
        if (x.l1_manager_id === id) { x.l1_manager_id = null; orphaned.push(x.name); }
        if (x.l2_manager_id === id) x.l2_manager_id = null;
      }
      log(s, { actor_id: actorId, action: "employee.delete", entity_id: id, summary: `Removed ${e.name}` });
      return { name: e.name, orphaned };
    });
  },

  // Adds the same metric to every employee in a department for a period
  // (starting their scorecard if needed). Returns how many got it.
  async addMetricToDepartment(actorId: string, departmentId: string, periodId: string,
    data: Omit<ScorecardMetric, "id" | "scorecard_id" | "sort_order" | "updated_at" | "updated_by">) {
    const people = mutate((s) => s.employees.filter((e) => e.department_id === departmentId));
    let added = 0;
    for (const e of people) {
      let scId = mutate((s) => s.scorecards.find((x) => x.employee_id === e.id && x.period_id === periodId)?.id);
      if (!scId) {
        scId = must("scorecards.insert", await sb().from("scorecards").insert({ employee_id: e.id, period_id: periodId }).select().single()).id;
      }
      const already = mutate((s) => s.metrics.some((m) => m.scorecard_id === scId && m.name.trim().toLowerCase() === data.name.trim().toLowerCase()));
      if (already) continue; // this person already has it: don't add a second copy
      const order = mutate((s) => s.metrics.filter((m) => m.scorecard_id === scId).length);
      const row = must("scorecard_metrics.insert", await sb().from("scorecard_metrics").insert({
        ...data, scorecard_id: scId, sort_order: order, updated_at: new Date().toISOString(), updated_by: safeActor(actorId),
      }).select().single());
      added++;
      await must("audit_log.insert", await sb().from("audit_log").insert({ actor_id: safeActor(actorId), action: "metric.create", entity_id: e.id, summary: `Added metric "${data.name}" (department-wide)` }));
      mutate((s) => {
        let sc = s.scorecards.find((x) => x.id === scId);
        if (!sc) { sc = { id: scId!, employee_id: e.id, period_id: periodId }; s.scorecards.push(sc); }
        s.metrics.push({ ...data, id: row.id, scorecard_id: scId!, sort_order: order, updated_at: row.updated_at, updated_by: actorId });
        log(s, { actor_id: actorId, action: "metric.create", entity_id: e.id, summary: `Added metric "${data.name}" (department-wide)` });
      });
    }
    return added;
  },

  async updateMetric(actorId: string, id: string, patch: Partial<ScorecardMetric>, summary: string) {
    const updated_at = new Date().toISOString();
    await must("scorecard_metrics.update", await sb().from("scorecard_metrics").update({ ...patch, updated_at, updated_by: safeActor(actorId) }).eq("id", id));
    const scEmployeeId = mutate((s) => {
      const m = s.metrics.find((x) => x.id === id);
      return m ? s.scorecards.find((x) => x.id === m.scorecard_id)?.employee_id : undefined;
    });
    if (scEmployeeId) await must("audit_log.insert", await sb().from("audit_log").insert({ actor_id: safeActor(actorId), action: "metric.update", entity_id: scEmployeeId, summary }));
    return mutate((s) => {
      const m = s.metrics.find((x) => x.id === id);
      if (!m) throw new Error("Metric not found");
      Object.assign(m, patch, { updated_at, updated_by: actorId });
      const sc = s.scorecards.find((x) => x.id === m.scorecard_id)!;
      log(s, { actor_id: actorId, action: "metric.update", entity_id: sc.employee_id, summary });
      return m;
    });
  },

  async addMetric(actorId: string, scorecardId: string, data: Omit<ScorecardMetric, "id" | "scorecard_id" | "sort_order" | "updated_at" | "updated_by">) {
    const order = mutate((s) => s.metrics.filter((m) => m.scorecard_id === scorecardId).length);
    const updated_at = new Date().toISOString();
    const row = must("scorecard_metrics.insert", await sb().from("scorecard_metrics").insert({
      ...data, scorecard_id: scorecardId, sort_order: order, updated_at, updated_by: safeActor(actorId),
    }).select().single());
    const employeeId = mutate((s) => s.scorecards.find((x) => x.id === scorecardId)?.employee_id);
    if (employeeId) await must("audit_log.insert", await sb().from("audit_log").insert({ actor_id: safeActor(actorId), action: "metric.create", entity_id: employeeId, summary: `Added metric "${data.name}"` }));
    return mutate((s) => {
      const sc = s.scorecards.find((x) => x.id === scorecardId);
      if (!sc) throw new Error("Scorecard not found");
      const m: ScorecardMetric = { ...data, id: row.id, scorecard_id: scorecardId, sort_order: order, updated_at, updated_by: actorId };
      s.metrics.push(m);
      log(s, { actor_id: actorId, action: "metric.create", entity_id: sc.employee_id, summary: `Added metric "${m.name}"` });
      return m;
    });
  },

  async removeMetric(actorId: string, id: string) {
    const found = mutate((s) => {
      const m = s.metrics.find((x) => x.id === id);
      const sc = m ? s.scorecards.find((x) => x.id === m.scorecard_id) : undefined;
      return m && sc ? { name: m.name, employeeId: sc.employee_id } : null;
    });
    if (!found) return;
    await must("scorecard_metrics.delete", await sb().from("scorecard_metrics").delete().eq("id", id));
    await must("audit_log.insert", await sb().from("audit_log").insert({ actor_id: safeActor(actorId), action: "metric.delete", entity_id: found.employeeId, summary: `Removed metric "${found.name}"` }));
    mutate((s) => {
      s.metrics = s.metrics.filter((x) => x.id !== id);
      log(s, { actor_id: actorId, action: "metric.delete", entity_id: found.employeeId, summary: `Removed metric "${found.name}"` });
    });
  },

  // New period's scorecard copies the latest one's metric definitions, with actuals cleared.
  async createScorecard(actorId: string, employeeId: string, periodId: string) {
    const already = mutate((s) => s.scorecards.some((x) => x.employee_id === employeeId && x.period_id === periodId));
    if (already) return;
    const scRow = must("scorecards.insert", await sb().from("scorecards").insert({ employee_id: employeeId, period_id: periodId }).select().single());
    // Copy the metric set from the closest earlier month that has a scorecard
    // (or, when back-filling the very first month, the closest later one).
    const previous = mutate((s) => {
      const target = s.periods.find((p) => p.id === periodId);
      const mine = s.scorecards
        .filter((x) => x.employee_id === employeeId)
        .map((x) => ({ x, starts: s.periods.find((p) => p.id === x.period_id)?.starts ?? "" }))
        .filter((r) => r.starts && r.x.id !== scRow.id)
        .sort((a, b) => a.starts.localeCompare(b.starts));
      const before = mine.filter((r) => !target || r.starts < target.starts);
      return (before.length ? before[before.length - 1] : mine[0])?.x;
    });
    let copiedMetrics: ScorecardMetric[] = [];
    if (previous) {
      const prevMetrics = mutate((s) => s.metrics.filter((m) => m.scorecard_id === previous.id));
      if (prevMetrics.length) {
        const rows = must("scorecard_metrics.insert", await sb().from("scorecard_metrics").insert(
          prevMetrics.map((m) => ({
            name: m.name, description: m.description, type: m.type, unit: m.unit, direction: m.direction,
            target: m.target, weight: m.weight, actual: null, actual_source: null,
            source_config: m.source_config, sort_order: m.sort_order, scorecard_id: scRow.id,
            updated_at: null, updated_by: null,
          }))
        ).select()) ?? [];
        copiedMetrics = rows.map((r: any, i: number) => ({ ...prevMetrics[i], id: r.id, scorecard_id: scRow.id, actual: null, actual_source: null, updated_at: null, updated_by: null }));
      }
    }
    const period = mutate((s) => s.periods.find((p) => p.id === periodId));
    await must("audit_log.insert", await sb().from("audit_log").insert({ actor_id: safeActor(actorId), action: "scorecard.create", entity_id: employeeId, summary: `Started scorecard for ${period?.label ?? periodId}` }));
    mutate((s) => {
      const sc: Scorecard = { id: scRow.id, employee_id: employeeId, period_id: periodId };
      s.scorecards.push(sc);
      copiedMetrics.forEach((m) => s.metrics.push(m));
      log(s, { actor_id: actorId, action: "scorecard.create", entity_id: employeeId, summary: `Started scorecard for ${period?.label ?? periodId}` });
    });
  },
};

// audit_log.actor_id references app_users.id. Every signed-in viewer is a
// real app_users row now, so this is just a passthrough kept for the call sites.
function safeActor(actorId: string): string | null {
  return actorId || null;
}
