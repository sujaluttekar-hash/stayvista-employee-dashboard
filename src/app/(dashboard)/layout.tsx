import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/profile";
import { DEPARTMENTS } from "@/lib/departments";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-60 flex-none bg-ink text-[#EDE6D8] flex flex-col py-6">
        <div className="px-6 pb-5 mb-4 border-b border-white/10">
          <div className="font-serif text-xl text-[#FAF6EE]">Employee Dashboard</div>
          <div className="text-[10px] uppercase tracking-wide text-[#A79C8A] mt-1">StayVista</div>
        </div>

        <nav className="flex-1 px-3 overflow-y-auto">
          <div className="text-[10px] uppercase tracking-wide text-[#A79C8A] px-3 pt-2 pb-1">Departments</div>
          {DEPARTMENTS.map((d) => (
            <Link
              key={d.slug}
              href={`/departments/${d.slug}`}
              className="block px-3 py-2 rounded text-[13.5px] hover:bg-white/5"
            >
              {d.name}
              {!d.hasRealMetrics && <span className="ml-2 text-[9px] text-[#A79C8A]">TBD</span>}
            </Link>
          ))}

          {profile.role === "manager" && (
            <>
              <div className="text-[10px] uppercase tracking-wide text-[#A79C8A] px-3 pt-4 pb-1">Manager</div>
              <Link href="/my-team" className="block px-3 py-2 rounded text-[13.5px] hover:bg-white/5">My team — edit scores</Link>
            </>
          )}
          {profile.role === "hr" && (
            <>
              <div className="text-[10px] uppercase tracking-wide text-[#A79C8A] px-3 pt-4 pb-1">HR</div>
              <Link href="/hr/roster" className="block px-3 py-2 rounded text-[13.5px] hover:bg-white/5">Org roster</Link>
            </>
          )}
          {profile.role === "data" && (
            <>
              <div className="text-[10px] uppercase tracking-wide text-[#A79C8A] px-3 pt-4 pb-1">Data</div>
              <Link href="/data/redash-sync" className="block px-3 py-2 rounded text-[13.5px] hover:bg-white/5">Redash sync</Link>
            </>
          )}
        </nav>

        <div className="px-6 pt-3 border-t border-white/10 text-[11px] text-[#A79C8A] leading-relaxed">
          {profile.full_name}
          <br />
          <span className="capitalize">{profile.role}</span> view
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-warmwhite">{children}</main>
    </div>
  );
}
