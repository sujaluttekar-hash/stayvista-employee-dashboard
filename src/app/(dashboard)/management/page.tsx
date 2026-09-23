import Link from "next/link";
import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/auth/session";
import { canManageEmployees } from "@/lib/auth/permissions";
import { db } from "@/lib/data/store";
import { resolvePeriod } from "@/lib/periods";
import { EmployeeTable } from "@/components/employee-table";
import { AddEmployeeForm } from "@/components/org-forms";

// HR + Data only. The master employee list: add, remove, set department.
export default function ManagementPage({ searchParams }: { searchParams: { dept?: string; period?: string } }) {
  const v = requireViewer();
  if (!canManageEmployees(v)) notFound();

  const period = resolvePeriod(db.periods(), searchParams.period);
  const departments = db.departments();
  const all = db.employees();
  const filter = searchParams.dept;
  const list = filter === "unassigned" ? all.filter((e) => !e.department_id)
    : filter ? all.filter((e) => db.department(e.department_id)?.slug === filter) : all;
  const unassigned = all.filter((e) => !e.department_id).length;
  const chip = (active: boolean) => `px-3 py-1.5 rounded-full border ${active ? "bg-ink text-warmwhite border-ink" : "border-line hover:bg-hair"}`;

  return (
    <div className="p-6 md:p-8 max-w-[1200px]">
      <h1 className="font-serif text-3xl">Management</h1>
      <p className="text-sm text-muted mt-1">
        The employee list for the whole company. People added here appear in each department&apos;s &ldquo;Add employee&rdquo; dropdown and as L1 / L2 manager options. Only HR and the Data team can see this page.
      </p>

      <div className="mt-6"><AddEmployeeForm
        departments={departments.map((d) => ({ id: d.id, name: d.name }))}
        people={all.filter((e) => e.status === "active").map((e) => ({ id: e.id, name: e.name, l1: e.l1_manager_id }))} /></div>

      <div className="mt-8 flex items-baseline justify-between">
        <h2 className="font-serif text-lg">{all.length} employees</h2>
        {unassigned > 0 && <span className="text-xs text-warn">{unassigned} not in a department yet</span>}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <Link href="/management" className={chip(!filter)}>All</Link>
        {unassigned > 0 && <Link href="/management?dept=unassigned" className={chip(filter === "unassigned")}>Unassigned</Link>}
        {departments.filter((d) => all.some((e) => e.department_id === d.id)).map((d) => (
          <Link key={d.id} href={`/management?dept=${d.slug}`} className={chip(filter === d.slug)}>{d.name}</Link>
        ))}
      </div>
      <div className="mt-4"><EmployeeTable employees={list} period={period} rowAction="remove" /></div>
      <p className="text-xs text-muted mt-3">To change someone&apos;s department, designation or L1 / L2 manager, open their name.</p>
    </div>
  );
}
