"use server";
// All mutations. Each one: (1) who is asking, (2) permission check from
// lib/auth/permissions, (3) validate, (4) write via the repository,
// (5) audit log, (6) revalidate. The UI hiding a button is never the gate.
import { revalidatePath } from "next/cache";
import { requireViewer } from "@/lib/auth/session";
import { assert, canEditScorecard, canManageOrg, canRunSync, PermissionError } from "@/lib/auth/permissions";
import { db, writes } from "@/lib/data/store";
import { fetchAutomaticValue } from "@/lib/sources";
import { formatValue } from "@/lib/scoring";
import type { EmployeeStatus, MetricDirection, MetricType, ScorecardMetric } from "@/lib/data/types";

export type ActionState = { ok?: string; error?: string } | null;

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
function num(f: FormData, k: string, label: string, { allowEmpty = false, min = -Infinity, max = Infinity } = {}) {
  const raw = str(f, k);
  if (raw === "") {
    if (allowEmpty) return null;
    throw new PermissionError(`${label} is required`);
  }
  const n = Number(raw);
  if (Number.isNaN(n)) throw new PermissionError(`${label} must be a number`);
  if (n < min || n > max) throw new PermissionError(`${label} must be between ${min} and ${max}`);
  return n;
}

async function run(fn: () => string | Promise<string>): Promise<ActionState> {
  try {
    const ok = await fn();
    revalidatePath("/", "layout");
    return { ok };
  } catch (e: any) {
    if (e instanceof PermissionError) return { error: e.message };
    if (e?.digest?.startsWith?.("NEXT_REDIRECT")) throw e;
    console.error(e);
    return { error: "Something went wrong. Please try again." };
  }
}

function scorecardOwner(scorecardId: string) {
  const sc = db.scorecardById(scorecardId);
  assert(!!sc, "Scorecard not found");
  const emp = db.employee(sc!.employee_id);
  assert(!!emp, "Employee not found");
  return emp!;
}

// ── Metrics ──────────────────────────────────────────────────────────
export async function updateMetric(_: ActionState, f: FormData) {
  return run(() => {
    const v = requireViewer();
    const m = db.metric(str(f, "metric_id"));
    assert(!!m, "Metric not found");
    const owner = scorecardOwner(m!.scorecard_id);
    assert(canEditScorecard(v, owner), `Only ${owner.name}'s manager can edit this scorecard`);

    const patch: Partial<ScorecardMetric> = {
      target: num(f, "target", "Target", { min: 0 })!,
      weight: num(f, "weight", "Weightage", { min: 0, max: 100 })!,
    };
    const changes: string[] = [];
    if (patch.target !== m!.target) changes.push(`target ${formatValue(m!.target, m!.unit)} → ${formatValue(patch.target!, m!.unit)}`);
    if (patch.weight !== m!.weight) changes.push(`weight ${m!.weight}% → ${patch.weight}%`);

    if (m!.type === "manual") {
      const actual = num(f, "actual", "Actual", { allowEmpty: true, min: 0 });
      if (actual !== m!.actual) {
        patch.actual = actual;
        patch.actual_source = actual == null ? null : "manual";
        changes.push(`actual ${formatValue(m!.actual, m!.unit)} → ${formatValue(actual, m!.unit)}`);
      }
    }
    if (!changes.length) return "No changes";
    writes.updateMetric(v.user.id, m!.id, patch, `${m!.name}: ${changes.join(", ")}`);
    return "Saved";
  });
}

export async function addMetric(_: ActionState, f: FormData) {
  return run(() => {
    const v = requireViewer();
    const scorecardId = str(f, "scorecard_id");
    const owner = scorecardOwner(scorecardId);
    assert(canEditScorecard(v, owner), `Only ${owner.name}'s manager can edit this scorecard`);
    const name = str(f, "name");
    assert(name.length > 1, "Give the metric a name");
    const type = str(f, "type") as MetricType;
    assert(type === "manual" || type === "automatic", "Choose Manual or Automatic");
    writes.addMetric(v.user.id, scorecardId, {
      name,
      description: str(f, "description"),
      type,
      unit: (str(f, "unit") || "count") as ScorecardMetric["unit"],
      direction: (str(f, "direction") || "higher_is_better") as MetricDirection,
      target: num(f, "target", "Target", { min: 0 })!,
      weight: num(f, "weight", "Weightage", { min: 0, max: 100 })!,
      actual: null,
      actual_source: null,
      source_config: type === "automatic" ? { kind: "redash", query_id: null, value_column: "value" } : null,
    });
    return `Added “${name}”`;
  });
}

export async function removeMetric(_: ActionState, f: FormData) {
  return run(() => {
    const v = requireViewer();
    const m = db.metric(str(f, "metric_id"));
    assert(!!m, "Metric not found");
    assert(canEditScorecard(v, scorecardOwner(m!.scorecard_id)));
    writes.removeMetric(v.user.id, m!.id);
    return "Removed";
  });
}

export async function startScorecard(_: ActionState, f: FormData) {
  return run(() => {
    const v = requireViewer();
    const emp = db.employee(str(f, "employee_id"));
    assert(!!emp, "Employee not found");
    assert(canEditScorecard(v, emp!), `Only ${emp!.name}'s manager can start a scorecard`);
    writes.createScorecard(v.user.id, emp!.id, str(f, "period_id"));
    return "Scorecard started";
  });
}

// ── Org structure (admin only) ───────────────────────────────────────
function validateManagers(employeeId: string | null, l1: string | null, l2: string | null) {
  if (employeeId) {
    assert(l1 !== employeeId && l2 !== employeeId, "Someone can't be their own manager");
    // Walk up from the proposed L1 — if we reach this employee, it's a loop.
    let cursor = l1, hops = 0;
    while (cursor && hops++ < 50) {
      assert(cursor !== employeeId, "That would create a reporting loop (A → B → A)");
      cursor = db.employee(cursor)?.l1_manager_id ?? null;
    }
  }
  assert(!l1 || !!db.employee(l1), "L1 manager not found");
  assert(!l2 || !!db.employee(l2), "L2 manager not found");
  assert(!l1 || !l2 || l1 !== l2, "L1 and L2 must be different people");
  assert(!l2 || !!l1, "Set an L1 manager before an L2");
}

export async function assignManagers(_: ActionState, f: FormData) {
  return run(() => {
    const v = requireViewer();
    assert(canManageOrg(v), "Only an admin can assign managers");
    const emp = db.employee(str(f, "employee_id"));
    assert(!!emp, "Employee not found");
    const l1 = str(f, "l1_manager_id") || null;
    const l2 = str(f, "l2_manager_id") || null;
    validateManagers(emp!.id, l1, l2);
    const name = (id: string | null) => db.employee(id)?.name ?? "none";
    writes.updateEmployee(v.user.id, emp!.id, { l1_manager_id: l1, l2_manager_id: l2 },
      `Managers for ${emp!.name}: L1 ${name(l1)}, L2 ${name(l2)}`);
    return "Managers updated";
  });
}

export async function updateEmployee(_: ActionState, f: FormData) {
  return run(() => {
    const v = requireViewer();
    assert(canManageOrg(v), "Only an admin can edit employee details");
    const emp = db.employee(str(f, "employee_id"));
    assert(!!emp, "Employee not found");
    const designation = str(f, "designation");
    const department_id = str(f, "department_id");
    const status = str(f, "status") as EmployeeStatus;
    assert(!!db.department(department_id), "Choose a department");
    assert(["active", "exit", "resigned"].includes(status), "Choose a status");
    writes.updateEmployee(v.user.id, emp!.id, { designation, department_id, status }, `Updated details for ${emp!.name}`);
    return "Details saved";
  });
}

export async function addEmployee(_: ActionState, f: FormData) {
  return run(() => {
    const v = requireViewer();
    assert(canManageOrg(v), "Only an admin can add employees");
    const name = str(f, "name");
    const employee_no = str(f, "employee_no");
    const department_id = str(f, "department_id");
    assert(name.length > 1, "Enter a name");
    assert(!!employee_no, "Enter an employee number");
    assert(!db.employees().some((e) => e.employee_no.toLowerCase() === employee_no.toLowerCase()), `Employee number ${employee_no} is already in use`);
    assert(!!db.department(department_id), "Choose a department");
    const l1 = str(f, "l1_manager_id") || null;
    const l2 = str(f, "l2_manager_id") || null;
    validateManagers(null, l1, l2);
    writes.addEmployee(v.user.id, {
      name, employee_no, department_id, designation: str(f, "designation"),
      status: "active", l1_manager_id: l1, l2_manager_id: l2,
    });
    return `${name} added`;
  });
}

// ── Automatic data (admin only) ──────────────────────────────────────
export async function syncAutomatic(_: ActionState, f: FormData) {
  return run(async () => {
    const v = requireViewer();
    assert(canRunSync(v), "Only an admin can run a data sync");
    const mode = str(f, "mode") === "demo" ? "demo" : "live";
    const period = db.periods().find((p) => p.id === str(f, "period_id"));
    assert(!!period, "Choose a review period");

    let filled = 0;
    const skipped: string[] = [];
    for (const sc of db.scorecards().filter((s) => s.period_id === period!.id)) {
      const emp = db.employee(sc.employee_id)!;
      for (const m of db.metrics(sc.id).filter((x) => x.type === "automatic")) {
        const r = await fetchAutomaticValue(m, emp, period!, mode);
        if (r.ok) {
          writes.updateMetric(v.user.id, m.id, { actual: r.value, actual_source: r.source },
            `${m.name}: ${r.source === "demo" ? "DEMO value" : "synced from Redash"} ${formatValue(r.value, m.unit)}`);
          filled++;
        } else skipped.push(r.reason);
      }
    }
    const reasons = Array.from(new Set(skipped));
    return mode === "demo"
      ? `Filled ${filled} automatic metrics with DEMO values`
      : `Synced ${filled} metrics${reasons.length ? `. Skipped ${skipped.length}: ${reasons.join("; ")}` : ""}`;
  });
}

export async function clearDemoValues(_: ActionState) {
  return run(() => {
    const v = requireViewer();
    assert(canRunSync(v));
    let n = 0;
    for (const sc of db.scorecards())
      for (const m of db.metrics(sc.id).filter((x) => x.actual_source === "demo")) {
        writes.updateMetric(v.user.id, m.id, { actual: null, actual_source: null }, `${m.name}: demo value cleared`);
        n++;
      }
    return `Cleared ${n} demo values`;
  });
}

export async function resetPreview(_: ActionState) {
  return run(() => {
    const v = requireViewer();
    assert(v.isAdmin, "Only an admin can reset preview data");
    writes.reset();
    return "Preview data reset";
  });
}
