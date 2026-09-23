import Link from "next/link";
import { redirect } from "next/navigation";
import { requireViewer } from "@/lib/auth/session";
import { canManageOrg } from "@/lib/auth/permissions";
import { db } from "@/lib/data/store";
import { resolvePeriod } from "@/lib/periods";
import { EmployeeTable } from "@/components/employee-table";
import { AddEmployeeForm } from "@/components/org-forms";

export default function EmployeesPage({ searchParams }: { searchParams: { dept?: string; period?: string } }) {
  const v = requireViewer();
  // The full directory is admin-only. Everyone else goes to their own scope.
  if (!v.isAdmin) redirect(v.isManager ? "/my-team" : `/employees/${v.employee?.id}`);

  const period = resolvePeriod(db.periods(), searchParams.period);
  const departments = db.departments();
  const dept = searchParams.dept ? db.departmentBySlug(searchParams.dept) : null;
  const all = db.employees();
  const list = dept ? all.filter((e) => e.department_id === dept.id) : all;

  return (
    <div className="p-6 md:p-8 max-w-[1200px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl">Employees</h1>
          <p className="text-sm text-muted mt-1">{all.length} people across {new Set(all.map((e) => e.department_id)).size} department{all.length === 1 ? "" : "s"}. Only admins see this full list.</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 text-xs">
        <Link href="/employees" className={`px-3 py-1.5 rounded-full border ${!dept ? "bg-ink text-warmwhite border-ink" : "border-line hover:bg-hair"}`}>All</Link>
        {departments.filter((d) => all.some((e) => e.department_id === d.id)).map((d) => (
          <Link key={d.id} href={`/employees?dept=${d.slug}`}
            className={`px-3 py-1.5 rounded-full border ${dept?.id === d.id ? "bg-ink text-warmwhite border-ink" : "border-line hover:bg-hair"}`}>{d.name}</Link>
        ))}
      </div>

      <div className="mt-4"><EmployeeTable employees={list} period={period} showDepartment={!dept} highlightId={v.employee?.id} /></div>

      {canManageOrg(v) && (
        <div className="mt-6">
          <AddEmployeeForm defaultDepartment={dept?.id ?? "d-bi"}
            departments={departments.map((d) => ({ id: d.id, name: d.name }))}
            people={all.filter((e) => e.status === "active").map((e) => ({ id: e.id, name: e.name, l1: e.l1_manager_id }))} />
        </div>
      )}
    </div>
  );
}
