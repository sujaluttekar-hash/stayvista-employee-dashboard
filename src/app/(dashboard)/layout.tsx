import Link from "next/link";
import { requireViewer } from "@/lib/auth/session";
import { canManageEmployees, canRunSync } from "@/lib/auth/permissions";
import { db, hydrateStore } from "@/lib/data/store";
import SignOut from "./sign-out";
import { NavLink } from "./nav-link";

const section = "text-[11px] text-[#A79C8A] px-3 pt-5 pb-1.5";

const ROLE_LABEL = { hr: "HR", manager: "Manager", data: "Data team" };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const v = await requireViewer();
  // Pages hydrate for themselves too (a layout and its page render at the
  // same time); this call is shared with theirs, so it costs nothing extra.
  await hydrateStore();
  const departments = db.departments();
  const staffed = new Set(db.employees().map((e) => e.department_id));

  return (
    <div className="flex flex-col md:flex-row md:h-screen md:overflow-hidden">
      <aside className="md:w-60 flex-none bg-ink text-[#EDE6D8] flex flex-col py-5 md:py-6">
        <div className="px-6 pb-4 mb-1 border-b border-white/10">
          <div className="font-serif text-xl text-[#FAF6EE]">Employee Dashboard</div>
          <div className="text-[11px] text-[#A79C8A] mt-0.5">StayVista</div>
        </div>

        <nav className="flex-1 px-3 overflow-y-auto">
          <div className="pt-3" />
          <NavLink href="/" exact>Overview</NavLink>
          {canManageEmployees(v) && <NavLink href="/management">Management</NavLink>}
          {canRunSync(v) && <NavLink href="/admin/data-sources">Data sources</NavLink>}
          <div className={section}>Departments</div>
          {departments.map((d) => (
            <NavLink key={d.id} href={`/departments/${d.slug}`}>
              <span className={staffed.has(d.id) ? "" : "text-[#A79C8A]"}>{d.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="px-6 pt-3 border-t border-white/10 text-xs text-[#A79C8A] leading-relaxed">
          <div className="text-[#EDE6D8]">Signed in as {ROLE_LABEL[v.role]}</div>
          <SignOut />
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-warmwhite">
        {children}
      </main>
    </div>
  );
}
