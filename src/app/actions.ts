"use server";
// All mutations. Each one: (1) who is asking, (2) permission check from
// lib/auth/permissions, (3) validate, (4) write via the repository,
// (5) audit log, (6) revalidate. The UI hiding a button is never the gate.
import { revalidatePath } from "next/cache";
import { requireViewer } from "@/lib/auth/session";
import { assert, canEditScores, canManageEmployees, canRunSync, PermissionError } from "@/lib/auth/permissions";
import { db, writes, hydrateStore } from "@/lib/data/store";
import { createSyncSession, redashConfigured } from "@/lib/sources";
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
    // Server actions run in their own invocation, separate from any page
    // render -- hydrate here too so permission checks and lookups inside
    // fn() see current Supabase data, not stale/empty local memory.
    await hydrateStore();
    const ok = await fn();
    revalidatePath("/", "layout");
    return { ok };
  } catch (e: any) {
    if (e instanceof PermissionError) return { error: e.message };
    if (e?.digest?.startsWith?.("NEXT_REDIRECT")) throw e;
    // Details go to the server log only; people see a plain message.
    console.error(e);
    return { error: "Something went wrong. Please try again. If it keeps happening, tell the Data team." };
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
  return run(async () => {
    const v = await requireViewer();
    const m = db.metric(str(f, "metric_id"));
    assert(!!m, "Metric not found");
    const owner = scorecardOwner(m!.scorecard_id);
    assert(canEditScores(v) && !!owner, "Only the Manager or Data team can edit scorecards");

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
    await writes.updateMetric(v.user.id, m!.id, patch, `${m!.name}: ${changes.join(", ")}`);
    return "Saved";
  });
}

export async function addMetric(_: ActionState, f: FormData) {
  return run(async () => {
    const v = await requireViewer();
    const scorecardId = str(f, "scorecard_id");
    const owner = scorecardOwner(scorecardId);
    assert(canEditScores(v) && !!owner, "Only the Manager or Data team can edit scorecards");
    const name = str(f, "name");
    assert(name.length > 1, "Give the metric a name");
    const type = str(f, "type") as MetricType;
    assert(type === "manual" || type === "automatic", "Choose Manual or Automatic");
    await writes.addMetric(v.user.id, scorecardId, {
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
  return run(async () => {
    const v = await requireViewer();
    const m = db.metric(str(f, "metric_id"));
    assert(!!m, "Metric not found");
    assert(canEditScores(v) && !!scorecardOwner(m!.scorecard_id), "Only the Manager or Data team can edit scorecards");
    await writes.removeMetric(v.user.id, m!.id);
    return "Removed";
  });
}

export async function startScorecard(_: ActionState, f: FormData) {
  return run(async () => {
    const v = await requireViewer();
    const emp = db.employee(str(f, "employee_id"));
    assert(!!emp, "Employee not found");
    assert(canEditScores(v), "Only the Manager or Data team can start a scorecard");
    await writes.createScorecard(v.user.id, emp!.id, str(f, "period_id"));
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
  return run(async () => {
    const v = await requireViewer();
    assert(canManageEmployees(v), "Only HR or the Data team can assign managers");
    const emp = db.employee(str(f, "employee_id"));
    assert(!!emp, "Employee not found");
    const l1 = str(f, "l1_manager_id") || null;
    const l2 = str(f, "l2_manager_id") || null;
    validateManagers(emp!.id, l1, l2);
    const name = (id: string | null) => db.employee(id)?.name ?? "none";
    await writes.updateEmployee(v.user.id, emp!.id, { l1_manager_id: l1, l2_manager_id: l2 },
      `Managers for ${emp!.name}: L1 ${name(l1)}, L2 ${name(l2)}`);
    return "Managers updated";
  });
}

export async function updateEmployee(_: ActionState, f: FormData) {
  return run(async () => {
    const v = await requireViewer();
    assert(canManageEmployees(v), "Only HR or the Data team can edit employee details");
    const emp = db.employee(str(f, "employee_id"));
    assert(!!emp, "Employee not found");
    const designation = str(f, "designation");
    const department_id = str(f, "department_id") || null;
    const status = str(f, "status") as EmployeeStatus;
    assert(!department_id || !!db.department(department_id), "Department not found");
    assert(["active", "exit", "resigned"].includes(status), "Choose a status");
    await writes.updateEmployee(v.user.id, emp!.id, { designation, department_id, status }, `Updated details for ${emp!.name}`);
    return "Details saved";
  });
}

export async function addEmployee(_: ActionState, f: FormData) {
  return run(async () => {
    const v = await requireViewer();
    assert(canManageEmployees(v), "Only HR or the Data team can add employees");
    const name = str(f, "name");
    assert(name.length > 1, "Enter a name");
    // Checked against Supabase directly, not the local store -- see
    // employeeNoTaken/nextEmployeeNo in store.ts for why.
    let employee_no = str(f, "employee_no");
    if (employee_no) assert(!(await db.employeeNoTaken(employee_no)), `Employee number ${employee_no} is already in use`);
    else employee_no = await db.nextEmployeeNo();
    const department_id = str(f, "department_id") || null;
    assert(!department_id || !!db.department(department_id), "Department not found");
    const l1 = str(f, "l1_manager_id") || null;
    const l2 = str(f, "l2_manager_id") || null;
    validateManagers(null, l1, l2);
    await writes.addEmployee(v.user.id, {
      name, employee_no, department_id, designation: str(f, "designation"),
      status: "active", l1_manager_id: l1, l2_manager_id: l2,
    });
    return `${name} added${department_id ? ` to ${db.department(department_id)!.name}` : ""}`;
  });
}

export async function removeEmployee(_: ActionState, f: FormData) {
  return run(async () => {
    const v = await requireViewer();
    assert(canManageEmployees(v), "Only HR or the Data team can remove employees");
    const r = await writes.removeEmployee(v.user.id, str(f, "employee_id"));
    assert(!!r, "Employee not found");
    return r!.orphaned.length
      ? `Removed ${r!.name}. ${r!.orphaned.join(", ")} now ${r!.orphaned.length > 1 ? "have" : "has"} no L1 manager`
      : `Removed ${r!.name}`;
  });
}

// Department page dropdown: place an existing employee into this department.
export async function placeInDepartment(_: ActionState, f: FormData) {
  return run(async () => {
    const v = await requireViewer();
    assert(canManageEmployees(v), "Only HR or the Data team can move employees");
    const emp = db.employee(str(f, "employee_id"));
    assert(!!emp, "Pick an employee");
    const dept = db.department(str(f, "department_id"));
    assert(!!dept, "Department not found");
    const from = db.department(emp!.department_id)?.name;
    await writes.updateEmployee(v.user.id, emp!.id, { department_id: dept!.id },
      `${emp!.name} moved ${from ? `from ${from} ` : ""}to ${dept!.name}`);
    return `${emp!.name} added to ${dept!.name}`;
  });
}

export async function unplaceFromDepartment(_: ActionState, f: FormData) {
  return run(async () => {
    const v = await requireViewer();
    assert(canManageEmployees(v), "Only HR or the Data team can move employees");
    const emp = db.employee(str(f, "employee_id"));
    assert(!!emp, "Employee not found");
    await writes.updateEmployee(v.user.id, emp!.id, { department_id: null }, `${emp!.name} taken out of ${db.department(emp!.department_id)?.name ?? "department"}`);
    return `${emp!.name} is now unassigned`;
  });
}

// Department page: add one metric to every employee in the department.
export async function addDepartmentMetric(_: ActionState, f: FormData) {
  return run(async () => {
    const v = await requireViewer();
    assert(canEditScores(v), "Only the Manager or Data team can add metrics");
    const dept = db.department(str(f, "department_id"));
    assert(!!dept, "Department not found");
    assert(db.employeesIn(dept!.id).length > 0, "Add employees to this department first");
    const name = str(f, "name");
    assert(name.length > 1, "Give the metric a name");
    const type = str(f, "type") as MetricType;
    assert(type === "manual" || type === "automatic", "Choose Manual or Automatic");
    const n = await writes.addMetricToDepartment(v.user.id, dept!.id, str(f, "period_id"), {
      name, description: str(f, "description"), type,
      unit: (str(f, "unit") || "count") as ScorecardMetric["unit"],
      direction: (str(f, "direction") || "higher_is_better") as MetricDirection,
      target: num(f, "target", "Target", { min: 0 })!,
      weight: num(f, "weight", "Weightage", { min: 0, max: 100 })!,
      actual: null, actual_source: null,
      source_config: type === "automatic" ? { kind: "redash", query_id: null, value_column: "value" } : null,
    });
    return `Added “${name}” to ${n} scorecard${n === 1 ? "" : "s"}`;
  });
}

// ── Automatic data (Data team only) ──────────────────────────────────
// Pulls every Redash-linked automatic metric for one month. Each query is
// fetched once and shared, unchanged values are left alone (so the audit
// log isn't flooded), and a problem with one metric never stops the rest.
export async function syncAutomatic(_: ActionState, f: FormData) {
  return run(async () => {
    const v = await requireViewer();
    assert(canRunSync(v), "Only the Data team can run a data sync");
    const period = db.periods().find((p) => p.id === str(f, "period_id"));
    assert(!!period, "Choose a review month");
    assert(redashConfigured(), "Redash isn't connected yet. Ask whoever manages the server to set REDASH_BASE_URL and REDASH_API_KEY.");

    type Job = { m: ScorecardMetric; e: NonNullable<ReturnType<typeof db.employee>> };
    const jobs: Job[] = [];
    for (const sc of db.scorecards().filter((s) => s.period_id === period!.id)) {
      const e = db.employee(sc.employee_id);
      if (!e || e.status !== "active") continue; // don't sync people who've left
      for (const m of db.metrics(sc.id)) if (m.type === "automatic") jobs.push({ m, e });
    }
    assert(jobs.length > 0, `No automatic metrics on any ${period!.label} scorecard yet`);

    const session = createSyncSession();
    await session.preload(jobs.flatMap(({ m }) => (m.source_config?.query_id ? [m.source_config.query_id] : [])));

    let updated = 0, unchanged = 0;
    const skipped = new Map<string, number>();
    const fail = (reason: string) => skipped.set(reason, (skipped.get(reason) ?? 0) + 1);

    // A few writes at a time: quick, without hammering the database.
    for (let i = 0; i < jobs.length; i += 6) {
      await Promise.all(jobs.slice(i, i + 6).map(async ({ m, e }) => {
        const r = await session.value(m, e, period!);
        if (!r.ok) return fail(r.reason);
        if (m.actual === r.value && m.actual_source === r.source) { unchanged++; return; }
        try {
          await writes.updateMetric(v.user.id, m.id, { actual: r.value, actual_source: r.source },
            `${m.name}: synced from Redash ${formatValue(m.actual, m.unit)} → ${formatValue(r.value, m.unit)}`);
          updated++;
        } catch (err) {
          console.error(err);
          fail("A value couldn't be saved");
        }
      }));
    }

    const problems = Array.from(skipped, ([reason, n]) => `${reason} (${n})`);
    const head = `${period!.label}: ${updated} updated, ${unchanged} already up to date`;
    if (!problems.length) return head;
    // Partial success is still reported as success; the skipped list says what to fix.
    return `${head}. Skipped ${Array.from(skipped.values()).reduce((a, b) => a + b, 0)}: ${problems.join("; ")}`;
  });
}

export async function clearDemoValues(_: ActionState) {
  return run(async () => {
    const v = await requireViewer();
    assert(canRunSync(v));
    let n = 0;
    for (const sc of db.scorecards())
      for (const m of db.metrics(sc.id).filter((x) => x.actual_source === "demo")) {
        await writes.updateMetric(v.user.id, m.id, { actual: null, actual_source: null }, `${m.name}: demo value cleared`);
        n++;
      }
    return `Cleared ${n} demo values`;
  });
}
