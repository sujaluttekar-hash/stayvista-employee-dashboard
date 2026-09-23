import Link from "next/link";
import { requireViewer } from "@/lib/auth/session";
import { canManageEmployees } from "@/lib/auth/permissions";
import { db } from "@/lib/data/store";
import { currentPeriod } from "@/lib/periods";
import { periodSummary } from "@/components/employee-table";
import { scoreTone } from "@/components/ui";

const DOT = { bloom: "bg-bloom-deep", sky: "bg-sky-deep", shine: "bg-shine-deep" };

const WHAT_YOU_CAN_DO = {
  hr: "You can add and remove employees, place them in departments and set their L1 / L2 managers. Scorecards are read-only for you.",
  manager: "You can add metrics and update scorecards in every department. Adding or removing employees is done by HR or the Data team.",
  data: "You have full access: employees, scorecards and data sources.",
};

export default function Overview() {
  const v = requireViewer();
  const period = currentPeriod(db.periods());
  const departments = db.departments();

  return (
    <div className="p-6 md:p-8 max-w-[1200px]">
      <h1 className="font-serif text-3xl">Departments</h1>
      <p className="text-sm text-muted mt-1 max-w-2xl">{WHAT_YOU_CAN_DO[v.role]}</p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((d) => {
          const people = db.employeesIn(d.id);
          const scores = people.map((e) => periodSummary(e.id, period.id)?.score).filter((s): s is number => s != null);
          const avg = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null;
          return (
            <Link key={d.id} href={`/departments/${d.slug}`} className="bg-panel border border-line rounded p-5 hover:border-ink/30 block">
              <div className="flex items-start justify-between gap-3">
                <div className="font-medium">{d.name}</div>
                <span className={`w-2 h-2 rounded-full mt-1.5 ${DOT[d.accent]}`} aria-hidden />
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-sm text-muted">{people.length ? `${people.length} ${people.length === 1 ? "person" : "people"}` : "No one yet"}</span>
                <span className={`font-serif text-2xl tabular-nums ${scoreTone(avg)}`}>{avg ?? "—"}</span>
              </div>
              <div className="text-[11px] text-muted text-right">avg score, {period.label}</div>
            </Link>
          );
        })}
      </div>
      {canManageEmployees(v) && <p className="text-xs text-muted mt-6">Add people from <Link href="/management" className="underline">Management</Link>, or from a department page.</p>}
    </div>
  );
}
