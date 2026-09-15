import { createClient } from "@/lib/supabase/server";
import { departmentBySlug } from "@/lib/departments";
import { notFound } from "next/navigation";

export default async function DepartmentPage({ params }: { params: { slug: string } }) {
  const dept = departmentBySlug(params.slug);
  if (!dept) notFound();

  const supabase = createClient();

  const { data: department } = await supabase
    .from("departments").select("id, name").eq("slug", params.slug).single();
  if (!department) notFound();

  // RLS does the real work here: a manager only gets rows for their
  // own reports back; HR/data get the whole department.
  const { data: people } = await supabase
    .from("people")
    .select("id, name, role_title, status, employee_no")
    .eq("department_id", department.id)
    .order("name");

  const { data: templates } = await supabase
    .from("scorecard_templates")
    .select("id, scorecard_metrics(id, key, name, weight, target, unit, is_placeholder)")
    .eq("department_id", department.id)
    .eq("is_active", true);

  const isPlaceholder = !dept.hasRealMetrics;

  return (
    <div className="p-8">
      <h1 className="font-serif text-2xl mb-1">{dept.name}</h1>
      <div className="text-sm text-muted mb-6">
        {people?.length ?? 0} {people?.length === 1 ? "person" : "people"} tracked
      </div>

      {isPlaceholder && (
        <div className="bg-warn-bg text-warn text-xs rounded px-4 py-3 mb-5 border border-warn/20">
          This department's scorecard is a placeholder — KPIs, weights, and
          targets are pending sign-off from the department lead. Nothing
          below reflects real scoring yet.
        </div>
      )}

      <div className="bg-panel border border-line rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-hair text-[11px] uppercase tracking-wide text-muted">
            <tr>
              <th className="text-left px-4 py-2">Person</th>
              <th className="text-left px-4 py-2">Role</th>
              <th className="text-left px-4 py-2">Status</th>
              {templates?.[0]?.scorecard_metrics?.map((m: any) => (
                <th key={m.id} className="text-center px-4 py-2">{m.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {people?.map((p) => (
              <tr key={p.id} className="border-t border-hair">
                <td className="px-4 py-2 font-medium">{p.name}</td>
                <td className="px-4 py-2 text-muted">{p.role_title}</td>
                <td className="px-4 py-2 text-muted">{p.status}</td>
                {templates?.[0]?.scorecard_metrics?.map((m: any) => (
                  <td key={m.id} className="px-4 py-2 text-center text-muted">—</td>
                ))}
              </tr>
            ))}
            {!people?.length && (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-muted text-xs">
                No one on the roster yet for this department.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* TODO: wire the `scores` table in here (join per person×month) and
          port the Hearth scorecard-doc / leaderboard / charts components.
          This page currently proves the roster + template read path end
          to end; the scoring UI is the next build phase. */}
    </div>
  );
}
