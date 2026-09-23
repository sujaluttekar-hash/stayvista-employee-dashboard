import Link from "next/link";
import { redirect } from "next/navigation";
import { requireViewer } from "@/lib/auth/session";
import { db } from "@/lib/data/store";
import { resolvePeriod } from "@/lib/periods";
import { metricStatus } from "@/lib/scoring";
import { EmployeeTable, periodSummary } from "@/components/employee-table";
import { scoreTone } from "@/components/ui";

// Manager view: self + DIRECT reports only. Nothing else in the org is queried.
export default function MyTeamPage({ searchParams }: { searchParams: { period?: string } }) {
  const v = requireViewer();
  if (!v.employee) redirect("/employees");
  if (!v.isManager) redirect(`/employees/${v.employee.id}`);

  const period = resolvePeriod(db.periods(), searchParams.period);
  const me = v.employee;
  const team = db.directReports(me.id);
  const mine = periodSummary(me.id, period.id);

  // What needs the manager's attention: manual metrics without an actual.
  const pending = team.flatMap((e) => {
    const sc = db.scorecard(e.id, period.id);
    if (!sc) return [{ e, label: "No scorecard started" }];
    const n = db.metrics(sc.id).filter((m) => metricStatus(m) === "not_started").length;
    return n ? [{ e, label: `${n} manual metric${n > 1 ? "s" : ""} to fill` }] : [];
  });

  return (
    <div className="p-6 md:p-8 max-w-[1200px]">
      <h1 className="font-serif text-3xl">My team</h1>
      <p className="text-sm text-muted mt-1">
        {team.length} direct report{team.length === 1 ? "" : "s"} for {period.label}. You can edit their scorecards; you only see people who report to you directly.
      </p>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
        <Link href={`/employees/${me.id}?period=${period.id}`} className="bg-panel border border-line rounded p-5 hover:border-ink/30 block">
          <div className="text-xs text-muted">Your scorecard</div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className={`font-serif text-4xl tabular-nums ${scoreTone(mine?.score ?? null)}`}>{mine?.score ?? "—"}</span>
            <span className="text-xs text-muted">/ 100</span>
          </div>
          <div className="text-xs text-muted mt-2">{mine ? `${mine.coverage}% of weightage has data` : "Not started"}</div>
          <div className="text-xs mt-3 text-sky-deep">View your scorecard</div>
        </Link>

        <div className="bg-panel border border-line rounded p-5">
          <div className="text-xs text-muted mb-2">Needs your input</div>
          {pending.length ? (
            <ul className="space-y-1.5">
              {pending.map(({ e, label }) => (
                <li key={e.id} className="text-sm flex justify-between gap-4">
                  <Link href={`/employees/${e.id}?period=${period.id}`} className="hover:underline">{e.name}</Link>
                  <span className="text-warn text-xs">{label}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-good">Every manual metric for your team is filled in.</p>}
        </div>
      </div>

      <h2 className="font-serif text-lg mt-8 mb-3">Direct reports</h2>
      <EmployeeTable employees={team} period={period} showDepartment={false} />
    </div>
  );
}
