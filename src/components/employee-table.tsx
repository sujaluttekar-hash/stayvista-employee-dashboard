import Link from "next/link";
import { db } from "@/lib/data/store";
import { overall } from "@/lib/scoring";
import type { Employee, ReviewPeriod } from "@/lib/data/types";
import { ActionButton } from "./forms";
import { initials, scoreTone } from "./ui";
import { removeEmployee, unplaceFromDepartment } from "@/app/actions";

export function periodSummary(employeeId: string, periodId: string) {
  const sc = db.scorecard(employeeId, periodId);
  return sc ? overall(db.metrics(sc.id)) : null;
}

// rowAction: "unplace" (department page) or "remove" (management page)
export function EmployeeTable({ employees, period, showDepartment = true, rowAction }: {
  employees: Employee[]; period: ReviewPeriod; showDepartment?: boolean; rowAction?: "unplace" | "remove";
}) {
  return (
    <div className="bg-panel border border-line rounded overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-hair text-xs text-muted">
          <tr>
            <th className="text-left font-medium px-4 py-2.5">Employee</th>
            {showDepartment && <th className="text-left font-medium px-4 py-2.5">Department</th>}
            <th className="text-left font-medium px-4 py-2.5">L1 manager</th>
            <th className="text-left font-medium px-4 py-2.5">L2 manager</th>
            <th className="text-right font-medium px-4 py-2.5">Score, {period.label}</th>
            <th className="text-left font-medium px-4 py-2.5">Status</th>
            {rowAction && <th className="px-4 py-2.5"><span className="sr-only">Actions</span></th>}
          </tr>
        </thead>
        <tbody>
          {employees.map((e) => {
            const s = periodSummary(e.id, period.id);
            return (
              <tr key={e.id} className="border-t border-hair">
                <td className="px-4 py-3">
                  <Link href={`/employees/${e.id}?period=${period.id}`} className="flex items-center gap-3 group">
                    <span className="w-8 h-8 rounded-full bg-sky-bg text-sky-deep text-xs font-semibold grid place-items-center flex-none">{initials(e.name)}</span>
                    <span>
                      <span className="font-medium group-hover:underline">{e.name}</span>
                      <span className="block text-xs text-muted">{e.designation || "—"}</span>
                    </span>
                  </Link>
                </td>
                {showDepartment && <td className="px-4 py-3">{db.department(e.department_id)?.name ?? <span className="text-warn text-xs">Unassigned</span>}</td>}
                <td className="px-4 py-3">{db.employee(e.l1_manager_id)?.name ?? <span className="text-muted">—</span>}</td>
                <td className="px-4 py-3">{db.employee(e.l2_manager_id)?.name ?? <span className="text-muted">—</span>}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {s ? (
                    <>
                      <span className={`font-medium ${scoreTone(s.score)}`}>{s.score ?? "—"}</span>
                      <span className="block text-[11px] text-muted">{s.coverage}% of weight has data</span>
                    </>
                  ) : <span className="text-xs text-muted">No scorecard</span>}
                </td>
                <td className="px-4 py-3 text-xs capitalize text-muted">{e.status}</td>
                {rowAction && (
                  <td className="px-4 py-3 text-right">
                    {rowAction === "unplace" ? (
                      <ActionButton action={unplaceFromDepartment} tone="danger" fields={{ employee_id: e.id }}
                        confirm={`Take ${e.name} out of this department? Their scorecard is kept.`}>Remove from department</ActionButton>
                    ) : (
                      <ActionButton action={removeEmployee} tone="danger" fields={{ employee_id: e.id }}
                        confirm={`Delete ${e.name} and all their scorecards? This can't be undone.`}>Delete</ActionButton>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
          {!employees.length && (
            <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-muted">No employees here yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
