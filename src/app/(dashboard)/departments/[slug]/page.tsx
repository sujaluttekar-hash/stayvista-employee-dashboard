import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/auth/session";
import { canBrowseDepartments } from "@/lib/auth/permissions";
import { db } from "@/lib/data/store";
import { resolvePeriod } from "@/lib/periods";
import { EmployeeTable } from "@/components/employee-table";
import { Notice } from "@/components/ui";

export default function DepartmentPage({ params, searchParams }: { params: { slug: string }; searchParams: { period?: string } }) {
  const v = requireViewer();
  const dept = db.departmentBySlug(params.slug);
  if (!dept || !canBrowseDepartments(v)) notFound();
  const period = resolvePeriod(db.periods(), searchParams.period);
  const people = db.employees().filter((e) => e.department_id === dept.id);

  return (
    <div className="p-6 md:p-8 max-w-[1200px]">
      <h1 className="font-serif text-3xl">{dept.name}</h1>
      <p className="text-sm text-muted mt-1 mb-6">{people.length} {people.length === 1 ? "person" : "people"}</p>
      {!dept.has_real_metrics && <div className="mb-5"><Notice>KPIs, weights and targets for this department are pending sign-off from its lead.</Notice></div>}
      <EmployeeTable employees={people} period={period} showDepartment={false} highlightId={v.employee?.id} />
    </div>
  );
}
