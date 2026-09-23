import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/session";
import { visiblePeople } from "@/lib/mock-data";
import { departmentBySlug } from "@/lib/departments";

export default function HrRosterPage() {
  const profile = getCurrentProfile();
  if (!profile) redirect("/login");
  const people = visiblePeople(profile);

  return (
    <div className="p-8">
      <h1 className="font-serif text-2xl mb-1">Org roster</h1>
      <div className="text-sm text-muted mb-6">
        {people.length} people across every department · status updates only — score edits stay with managers
      </div>
      <div className="bg-panel border border-line rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-hair text-[11px] uppercase tracking-wide text-muted">
            <tr>
              <th className="text-left px-4 py-2">Person</th>
              <th className="text-left px-4 py-2">Department</th>
              <th className="text-left px-4 py-2">Role</th>
              <th className="text-left px-4 py-2">Employee No.</th>
              <th className="text-left px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {people.map((p) => (
              <tr key={p.id} className="border-t border-hair">
                <td className="px-4 py-2 font-medium">{p.name}</td>
                <td className="px-4 py-2 text-muted">{departmentBySlug(p.department_slug)?.name}</td>
                <td className="px-4 py-2 text-muted">{p.role_title}</td>
                <td className="px-4 py-2 text-muted">{p.employee_no}</td>
                <td className="px-4 py-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-good-bg text-good">{p.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
