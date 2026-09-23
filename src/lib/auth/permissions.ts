import "server-only";
// ─────────────────────────────────────────────────────────────────────
// SINGLE SOURCE OF TRUTH for who can see / do what.
// Every page and every server action calls these — never re-implement a
// check inline. When Supabase arrives, mirror these rules as RLS
// policies so the database enforces them too (defence in depth).
//
//   Admin    → everything
//   Manager  → self + DIRECT reports (L1). Edits direct reports' scorecards.
//              Skip-level (L2) reports are NOT visible — per spec.
//   Employee → self only, read-only
// ─────────────────────────────────────────────────────────────────────
import { db } from "@/lib/data/store";
import type { Employee } from "@/lib/data/types";
import type { Viewer } from "./session";

export function canViewEmployee(v: Viewer, target: Employee) {
  if (v.isAdmin) return true;
  if (!v.employee) return false;
  return target.id === v.employee.id || target.l1_manager_id === v.employee.id;
}

// Only the direct (L1) manager, or an admin. Nobody edits their own metrics.
export function canEditScorecard(v: Viewer, target: Employee) {
  if (v.isAdmin) return true;
  return !!v.employee && target.l1_manager_id === v.employee.id;
}

export const canManageOrg = (v: Viewer) => v.isAdmin; // add employees, assign managers, departments
export const canBrowseDepartments = (v: Viewer) => v.isAdmin;
export const canRunSync = (v: Viewer) => v.isAdmin;

export function visibleEmployees(v: Viewer): Employee[] {
  if (v.isAdmin) return db.employees();
  if (!v.employee) return [];
  return [v.employee, ...db.directReports(v.employee.id)];
}

export class PermissionError extends Error {}
export function assert(ok: boolean, message = "You don't have permission to do that") {
  if (!ok) throw new PermissionError(message);
}
