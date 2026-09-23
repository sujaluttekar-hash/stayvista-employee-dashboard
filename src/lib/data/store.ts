import "server-only";
// ─────────────────────────────────────────────────────────────────────
// PREVIEW REPOSITORY. Every read/write in the app goes through this file.
// Swapping to Supabase later = re-implement these functions with queries;
// no page or permission code needs to change.
//
// Storage: a JSON file (.data/preview-store.json locally, /tmp on
// Vercel). On Vercel, /tmp is per-instance and can reset at any time —
// fine for a demo, not for real data.
// ─────────────────────────────────────────────────────────────────────
import fs from "fs";
import os from "os";
import path from "path";
import type { Store, Employee, ScorecardMetric, AuditEntry, Scorecard } from "./types";
import { buildSeed, STORE_VERSION } from "./seed";

function storePath() {
  if (process.env.PREVIEW_STORE_PATH) return process.env.PREVIEW_STORE_PATH;
  const local = path.join(process.cwd(), ".data", "preview-store.json");
  try {
    fs.mkdirSync(path.dirname(local), { recursive: true });
    fs.accessSync(path.dirname(local), fs.constants.W_OK);
    return local;
  } catch {
    return path.join(os.tmpdir(), "sv-preview-store.json");
  }
}

let memory: Store | null = null;

function read(): Store {
  const p = storePath();
  try {
    const parsed = JSON.parse(fs.readFileSync(p, "utf8")) as Store;
    if (parsed.version === STORE_VERSION) return (memory = parsed);
  } catch {
    /* missing or unreadable — fall through to seed */
  }
  if (memory && memory.version === STORE_VERSION) return memory;
  const seeded = buildSeed();
  write(seeded);
  return seeded;
}

function write(s: Store) {
  memory = s;
  try {
    fs.writeFileSync(storePath(), JSON.stringify(s, null, 2));
  } catch {
    /* read-only filesystem — keep in memory only */
  }
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
  department: (id: string) => read().departments.find((d) => d.id === id) ?? null,
  departmentBySlug: (slug: string) => read().departments.find((d) => d.slug === slug) ?? null,
  employees: () => [...read().employees].sort((a, b) => a.name.localeCompare(b.name)),
  employee: (id: string | null | undefined) => (id ? read().employees.find((e) => e.id === id) ?? null : null),
  directReports: (managerId: string) => db.employees().filter((e) => e.l1_manager_id === managerId),
  users: () => read().users,
  user: (id: string | undefined) => read().users.find((u) => u.id === id) ?? null,
  userForEmployee: (employeeId: string) => read().users.find((u) => u.employee_id === employeeId) ?? null,
  periods: () => read().periods,
  scorecard: (employeeId: string, periodId: string) =>
    read().scorecards.find((s) => s.employee_id === employeeId && s.period_id === periodId) ?? null,
  scorecards: () => read().scorecards,
  metrics: (scorecardId: string) =>
    read().metrics.filter((m) => m.scorecard_id === scorecardId).sort((a, b) => a.sort_order - b.sort_order),
  metric: (id: string) => read().metrics.find((m) => m.id === id) ?? null,
  scorecardById: (id: string) => read().scorecards.find((s) => s.id === id) ?? null,
  audit: (entityIds: string[], limit = 15) =>
    read().audit.filter((a) => entityIds.includes(a.entity_id)).slice(0, limit),
};

// ── Writes ───────────────────────────────────────────────────────────
function log(s: Store, entry: Omit<AuditEntry, "id" | "at">) {
  s.audit.unshift({ ...entry, id: uid("a"), at: new Date().toISOString() });
  s.audit = s.audit.slice(0, 500);
}

export const writes = {
  updateEmployee(actorId: string, id: string, patch: Partial<Omit<Employee, "id">>, summary: string) {
    return mutate((s) => {
      const e = s.employees.find((x) => x.id === id);
      if (!e) throw new Error("Employee not found");
      Object.assign(e, patch);
      log(s, { actor_id: actorId, action: "employee.update", entity_id: id, summary });
      return e;
    });
  },

  addEmployee(actorId: string, data: Omit<Employee, "id">) {
    return mutate((s) => {
      const e: Employee = { ...data, id: uid("e") };
      s.employees.push(e);
      // Every employee gets a login in preview so their view can be tested.
      s.users.push({ id: uid("u"), display_name: e.name, employee_id: e.id, is_admin: false });
      log(s, { actor_id: actorId, action: "employee.create", entity_id: e.id, summary: `Added ${e.name}` });
      return e;
    });
  },

  updateMetric(actorId: string, id: string, patch: Partial<ScorecardMetric>, summary: string) {
    return mutate((s) => {
      const m = s.metrics.find((x) => x.id === id);
      if (!m) throw new Error("Metric not found");
      Object.assign(m, patch, { updated_at: new Date().toISOString(), updated_by: actorId });
      const sc = s.scorecards.find((x) => x.id === m.scorecard_id)!;
      log(s, { actor_id: actorId, action: "metric.update", entity_id: sc.employee_id, summary });
      return m;
    });
  },

  addMetric(actorId: string, scorecardId: string, data: Omit<ScorecardMetric, "id" | "scorecard_id" | "sort_order" | "updated_at" | "updated_by">) {
    return mutate((s) => {
      const sc = s.scorecards.find((x) => x.id === scorecardId);
      if (!sc) throw new Error("Scorecard not found");
      const order = s.metrics.filter((m) => m.scorecard_id === scorecardId).length;
      const m: ScorecardMetric = { ...data, id: uid("m"), scorecard_id: scorecardId, sort_order: order, updated_at: new Date().toISOString(), updated_by: actorId };
      s.metrics.push(m);
      log(s, { actor_id: actorId, action: "metric.create", entity_id: sc.employee_id, summary: `Added metric “${m.name}”` });
      return m;
    });
  },

  removeMetric(actorId: string, id: string) {
    return mutate((s) => {
      const m = s.metrics.find((x) => x.id === id);
      if (!m) return;
      const sc = s.scorecards.find((x) => x.id === m.scorecard_id)!;
      s.metrics = s.metrics.filter((x) => x.id !== id);
      log(s, { actor_id: actorId, action: "metric.delete", entity_id: sc.employee_id, summary: `Removed metric “${m.name}”` });
    });
  },

  // New period's scorecard copies the latest one's metric definitions, with actuals cleared.
  createScorecard(actorId: string, employeeId: string, periodId: string) {
    return mutate((s) => {
      if (s.scorecards.some((x) => x.employee_id === employeeId && x.period_id === periodId)) return;
      const sc: Scorecard = { id: uid("sc"), employee_id: employeeId, period_id: periodId };
      const previous = s.scorecards.filter((x) => x.employee_id === employeeId).pop();
      s.scorecards.push(sc);
      if (previous) {
        s.metrics.filter((m) => m.scorecard_id === previous.id).forEach((m) =>
          s.metrics.push({ ...m, id: uid("m"), scorecard_id: sc.id, actual: null, actual_source: null, updated_at: null, updated_by: null })
        );
      }
      const period = s.periods.find((p) => p.id === periodId);
      log(s, { actor_id: actorId, action: "scorecard.create", entity_id: employeeId, summary: `Started scorecard for ${period?.label ?? periodId}` });
    });
  },

  reset() {
    write(buildSeed());
  },
};
