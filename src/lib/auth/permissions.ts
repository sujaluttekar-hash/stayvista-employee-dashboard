import "server-only";
// ─────────────────────────────────────────────────────────────────────
// SINGLE SOURCE OF TRUTH for who can do what. Every page and every
// server action calls these. Change a rule here and it changes everywhere.
//
//                          HR    Manager   Data
//   View all departments    ✓       ✓        ✓
//   Management tab          ✓       –        ✓   add / remove employees, set department & L1/L2
//   Add employee to a dept  ✓       –        ✓
//   Edit scorecards/metrics –       ✓        ✓
//   Data sources / reset    –       –        ✓
// ─────────────────────────────────────────────────────────────────────
import type { Viewer } from "./session";

export const canManageEmployees = (v: Viewer) => v.role === "hr" || v.role === "data";
export const canEditScores = (v: Viewer) => v.role === "manager" || v.role === "data";
export const canRunSync = (v: Viewer) => v.role === "data";

export class PermissionError extends Error {}
export function assert(ok: boolean, message = "You don't have permission to do that") {
  if (!ok) throw new PermissionError(message);
}
