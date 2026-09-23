import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/auth/session";
import { canEditScores, canManageEmployees } from "@/lib/auth/permissions";
import { db } from "@/lib/data/store";
import { resolvePeriod } from "@/lib/periods";
import { EmployeeTable } from "@/components/employee-table";
import { AddMetricForm, PlaceEmployeeForm } from "@/components/org-forms";
import { Notice } from "@/components/ui";

export default function DepartmentPage({ params, searchParams }: { params: { slug: string }; searchParams: { period?: string } }) {
  const v = requireViewer();
  const dept = db.departmentBySlug(params.slug);
  if (!dept) notFound();
  const period = resolvePeriod(db.periods(), searchParams.period);
  const people = db.employeesIn(dept.id);
  const manage = canManageEmployees(v);
  const candidates = db.employees().filter((e) => e.department_id !== dept.id)
    .map((e) => ({ id: e.id, name: e.name, current: db.department(e.department_id)?.name ?? null }));

  return (
    <div className="p-6 md:p-8 max-w-[1200px]">
      <h1 className="font-serif text-3xl">{dept.name}</h1>
      <p className="text-sm text-muted mt-1 mb-6">{people.length} {people.length === 1 ? "person" : "people"}, {period.label}</p>
      {!dept.has_real_metrics && <div className="mb-5"><Notice>KPIs, weights and targets for this department are pending sign-off from its lead.</Notice></div>}

      {(manage || canEditScores(v)) && (
        <div className="mb-5 bg-panel border border-line rounded p-4 space-y-4">
          {manage && <PlaceEmployeeForm departmentId={dept.id} candidates={candidates} />}
          {canEditScores(v) && (
            people.length
              ? <AddMetricForm departmentId={dept.id} periodId={period.id} label="Add metric to everyone in this department"
                  note={`Adds this metric to all ${people.length} scorecards in ${dept.name} for ${period.label}. To add a metric to one person, open their scorecard.`} />
              : <p className="text-xs text-muted">Add employees before adding department metrics.</p>
          )}
        </div>
      )}

      <EmployeeTable employees={people} period={period} showDepartment={false} rowAction={manage ? "unplace" : undefined} />
    </div>
  );
}
