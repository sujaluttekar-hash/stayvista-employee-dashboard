import { notFound, redirect } from "next/navigation";
import { departmentBySlug } from "@/lib/departments";
import { getCurrentProfile } from "@/lib/session";
import { METRICS, visiblePeople } from "@/lib/mock-data";

export default function DepartmentPage({ params }: { params: { slug: string } }) {
  const dept = departmentBySlug(params.slug);
  if (!dept) notFound();
  const profile = getCurrentProfile();
  if (!profile) redirect("/login");

  const people = visiblePeople(profile, dept.slug);
  const metrics = METRICS[dept.slug] ?? [];

  return (
    <div className="p-8">
      <h1 className="font-serif text-2xl mb-1">{dept.name}</h1>
      <div className="text-sm text-muted mb-6">
        {people.length} {people.length === 1 ? "person" : "people"} tracked
      </div>

      {!dept.hasRealMetrics && (
        <div className="bg-warn-bg text-warn text-xs rounded px-4 py-3 mb-5 border border-warn/20">
          This department&apos;s scorecard is a placeholder — KPIs, weights, and
          targets are pending sign-off from the department lead.
        </div>
      )}

      <div className="bg-panel border border-line rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-hair text-[11px] uppercase tracking-wide text-muted">
            <tr>
              <th className="text-left px-4 py-2">Person</th>
              <th className="text-left px-4 py-2">Role</th>
              <th className="text-left px-4 py-2">Status</th>
              {metrics.map((m) => <th key={m.id} className="text-center px-4 py-2">{m.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {people.map((p) => (
              <tr key={p.id} className="border-t border-hair">
                <td className="px-4 py-2 font-medium">{p.name}</td>
                <td className="px-4 py-2 text-muted">{p.role_title}</td>
                <td className="px-4 py-2 text-muted">{p.status}</td>
                {metrics.map((m) => <td key={m.id} className="px-4 py-2 text-center text-muted">—</td>)}
              </tr>
            ))}
            {!people.length && (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-muted text-xs">
                No one on the roster yet for this department.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
