import Link from "next/link";
import { requireViewer } from "@/lib/auth/session";
import { canBrowseDepartments, canRunSync } from "@/lib/auth/permissions";
import { db } from "@/lib/data/store";
import SignOut from "./sign-out";
import { NavLink } from "./nav-link";

const section = "text-[11px] text-[#A79C8A] px-3 pt-5 pb-1.5";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const v = requireViewer();
  const roleLabel = v.isAdmin ? "Admin" : v.isManager ? "Manager" : "Employee";
  const departments = canBrowseDepartments(v) ? db.departments() : [];
  const staffed = new Set(db.employees().map((e) => e.department_id));

  return (
    <div className="flex flex-col md:flex-row md:h-screen md:overflow-hidden">
      <aside className="md:w-60 flex-none bg-ink text-[#EDE6D8] flex flex-col py-5 md:py-6">
        <div className="px-6 pb-4 mb-1 border-b border-white/10">
          <div className="font-serif text-xl text-[#FAF6EE]">Employee Dashboard</div>
          <div className="text-[11px] text-[#A79C8A] mt-0.5">StayVista</div>
        </div>

        <nav className="flex-1 px-3 overflow-y-auto">
          <div className={section}>You</div>
          {v.employee && <NavLink href={`/employees/${v.employee.id}`}>My scorecard</NavLink>}
          {v.isManager && <NavLink href="/my-team">My team</NavLink>}

          {v.isAdmin && (
            <>
              <div className={section}>Organisation</div>
              <NavLink href="/employees" exact>Employees</NavLink>
              {canRunSync(v) && <NavLink href="/admin/data-sources">Data sources</NavLink>}
              <div className={section}>Departments</div>
              {departments.map((d) => (
                <NavLink key={d.id} href={`/departments/${d.slug}`}>
                  <span className={staffed.has(d.id) ? "" : "text-[#A79C8A]"}>{d.name}</span>
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className="px-6 pt-3 border-t border-white/10 text-xs text-[#A79C8A] leading-relaxed">
          <div className="text-[#EDE6D8]">{v.user.display_name}</div>
          <div>{roleLabel} view</div>
          <SignOut />
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-warmwhite">
        <div className="bg-shine-bg text-shine-deep text-xs px-6 md:px-8 py-2 border-b border-shine/40">
          Preview mode. Sign-in has no password and data resets can happen. Don&apos;t enter anything confidential.
        </div>
        {children}
      </main>
    </div>
  );
}
