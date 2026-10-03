import Link from "next/link";
import { requireViewer } from "@/lib/auth/session";
import { canManageEmployees } from "@/lib/auth/permissions";
import { db, hydrateStore } from "@/lib/data/store";
import { resolvePeriod } from "@/lib/periods";
import { PeriodSwitcher } from "@/components/period-switcher";
import { periodSummary } from "@/components/employee-table";
import { scoreTone } from "@/components/ui";

const DOT = { bloom: "bg-bloom-deep", sky: "bg-sky-deep", shine: "bg-shine-deep" };

const WHAT_YOU_CAN_DO = {
  hr: "You can add and remove employees, place them in departments and set their L1 / L2 managers. Scorecards are read-only for you.",
  manager: "You can add metrics and update scorecards in every department. Adding or removing employees is done by HR or the Data team.",
  data: "You have full access: employees, scorecards and data sources.",
};

export default async function Overview({ searchParams }: { searchParams: { period?: string } }) {
  const v = await requireViewer();
  await hydrateStore();
  const period = resolvePeriod(db.periods(), searchParams.period);
  const departments = db.departments();

  return (
    <div className="p-6 md:p-8 max-w-[1200px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-serif text-3xl">Departments</h1>
        <PeriodSwitcher periods={db.periods()} active={period} basePath="/" />
      </div>
      <p className="text-sm text-muted mt-1 max-w-2xl">{WHAT_YOU_CAN_DO[v.role]}</p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((d) => {
          const people = db.employeesIn(d.id);
          const sums = people.map((e) => periodSummary(e.id, period.id)).filter((s): s is NonNullable<typeof s> => !!s && s.score != null);
          // Rated (out of 5) people are averaged on their own scale; mixing scales would be meaningless.
          const five = sums.length > 0 && sums.every((s) => s.scale === "five");
          const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
          const avg = !sums.length ? null : five ? Math.round(mean(sums.map((s) => s.score!)) * 100) / 100 : Math.round(mean(sums.map((s) => s.percent!)) * 10) / 10;
          const avgPercent = !sums.length ? null : mean(sums.map((s) => s.percent!));
          return (
            <Link key={d.id} href={`/departments/${d.slug}?period=${period.id}`} className="bg-panel border border-line rounded p-5 hover:border-ink/30 block">
              <div className="flex items-start justify-between gap-3">
                <div className="font-medium">{d.name}</div>
                <span className={`w-2 h-2 rounded-full mt-1.5 ${DOT[d.accent]}`} aria-hidden />
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-sm text-muted">{people.length ? `${people.length} ${people.length === 1 ? "person" : "people"}` : "No one yet"}</span>
                <span className={`font-serif text-2xl tabular-nums ${scoreTone(avgPercent)}`}>{avg == null ? "—" : five ? `${avg.toFixed(2)}` : avg}{five && <span className="text-xs text-muted"> / 5</span>}</span>
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
