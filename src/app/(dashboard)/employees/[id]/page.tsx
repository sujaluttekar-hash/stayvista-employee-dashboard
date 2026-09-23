import Link from "next/link";
import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/auth/session";
import { canEditScorecard, canManageOrg, canViewEmployee, visibleEmployees } from "@/lib/auth/permissions";
import { db } from "@/lib/data/store";
import { overall } from "@/lib/scoring";
import { resolvePeriod } from "@/lib/periods";
import { MetricRow } from "@/components/metric-row";
import { AddMetricForm, AssignManagerForm, EmployeeDetailsForm } from "@/components/org-forms";
import { ActionButton } from "@/components/forms";
import { Notice, initials, scoreTone } from "@/components/ui";
import { startScorecard } from "@/app/actions";

export default function EmployeeScorecardPage({ params, searchParams }: { params: { id: string }; searchParams: { period?: string } }) {
  const v = requireViewer();
  const emp = db.employee(params.id);
  // Same response for "doesn't exist" and "not allowed" — don't leak who exists.
  if (!emp || !canViewEmployee(v, emp)) notFound();

  const periods = db.periods();
  const period = resolvePeriod(periods, searchParams.period);
  const sc = db.scorecard(emp.id, period.id);
  const metrics = sc ? db.metrics(sc.id) : [];
  const summary = overall(metrics);
  const canEdit = canEditScorecard(v, emp);
  const isSelf = v.employee?.id === emp.id;
  const dept = db.department(emp.department_id);
  const l1 = db.employee(emp.l1_manager_id);
  const l2 = db.employee(emp.l2_manager_id);
  const hasDemo = metrics.some((m) => m.actual_source === "demo");
  const manualCount = metrics.filter((m) => m.type === "manual").length;

  const nameOf = (userId: string | null) => {
    if (!userId) return null;
    if (userId === "seed") return "Sample data";
    return db.user(userId)?.display_name ?? "Unknown";
  };

  const access = v.isAdmin && !isSelf
    ? { tone: "info" as const, text: "Admin view — you can edit this scorecard and this person's reporting line." }
    : canEdit
      ? { tone: "info" as const, text: `You're ${emp.name}'s L1 manager, so you can update these metrics.` }
      : isSelf
        ? { tone: "info" as const, text: `This is your scorecard. It's read-only — ${l1 ? `${l1.name} (your L1 manager)` : "your manager"} updates it.` }
        : null;

  const backHref = v.isAdmin ? "/employees" : "/my-team";
  const audit = db.audit([emp.id], 12);

  return (
    <div className="p-6 md:p-8 max-w-[1200px]">
      {!isSelf && visibleEmployees(v).length > 1 && (
        <Link href={backHref} className="text-xs text-muted hover:underline">← {v.isAdmin ? "All employees" : "My team"}</Link>
      )}

      {/* Employee */}
      <header className="mt-3 flex flex-col md:flex-row md:items-end gap-6 justify-between">
        <div className="flex items-center gap-4">
          <span className="w-14 h-14 rounded-full bg-sky-bg text-sky-deep text-lg font-semibold grid place-items-center">{initials(emp.name)}</span>
          <div>
            <h1 className="font-serif text-3xl leading-tight">{emp.name}</h1>
            <div className="text-sm text-muted">{emp.designation || "No designation"} in {dept?.name}</div>
          </div>
        </div>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-2 text-sm">
          <div><dt className="text-xs text-muted">L1 manager</dt><dd>{l1?.name ?? "Not assigned"}</dd></div>
          <div><dt className="text-xs text-muted">L2 manager</dt><dd>{l2?.name ?? "Not assigned"}</dd></div>
          <div><dt className="text-xs text-muted">Employee no.</dt><dd className="tabular-nums">{emp.employee_no}</dd></div>
          <div><dt className="text-xs text-muted">Status</dt><dd className="capitalize">{emp.status}</dd></div>
        </dl>
      </header>

      {access && <div className="mt-6"><Notice tone={access.tone}>{access.text}</Notice></div>}

      {/* Period switcher */}
      <nav className="mt-8 flex items-center gap-1 border-b border-line" aria-label="Review period">
        {periods.map((p) => (
          <Link key={p.id} href={`/employees/${emp.id}?period=${p.id}`}
            className={`px-4 py-2 text-sm -mb-px border-b-2 ${p.id === period.id ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"}`}>
            {p.label}
          </Link>
        ))}
      </nav>

      {!sc ? (
        <div className="mt-6 bg-panel border border-line rounded p-8 text-center">
          <div className="font-serif text-lg">No scorecard for {period.label} yet</div>
          <p className="text-sm text-muted mt-1 mb-4">
            {canEdit ? "Start one — it copies the metrics from the previous period with actuals cleared." : "Their manager hasn't started this period's scorecard."}
          </p>
          {canEdit && <div className="inline-block"><ActionButton action={startScorecard} tone="primary" fields={{ employee_id: emp.id, period_id: period.id }}>Start {period.label} scorecard</ActionButton></div>}
        </div>
      ) : (
        <>
          {/* Summary */}
          <section className="mt-6 grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-6 items-center">
            <div className="flex items-baseline gap-2">
              <span className={`font-serif text-6xl tabular-nums leading-none ${scoreTone(summary.score)}`}>{summary.score ?? "—"}</span>
              <span className="text-sm text-muted">overall<br />out of 100</span>
            </div>
            <div className="max-w-md">
              <div className="flex justify-between text-xs text-muted mb-1.5">
                <span>{summary.coverage}% of weightage has data</span>
                <span>{manualCount} manual · {metrics.length - manualCount} automatic</span>
              </div>
              <div className="h-1.5 bg-hair rounded-full overflow-hidden">
                <div className="h-full bg-sky-deep" style={{ width: `${summary.coverage}%` }} />
              </div>
              <p className="text-[11px] text-muted mt-1.5">The overall score only counts metrics that have an actual, so missing data doesn&apos;t pull it down. Check coverage before comparing people.</p>
            </div>
          </section>

          <div className="mt-6 space-y-2">
            {!summary.weightOk && <Notice>Weightage adds up to {summary.totalWeight}%, not 100%. {canEdit ? "Adjust the weights below." : "Your manager needs to adjust the weights."}</Notice>}
            {hasDemo && <Notice>Some automatic values are <strong>demo data</strong> for testing and are not real. They&apos;re tagged “Demo”.</Notice>}
            {!dept?.has_real_metrics && <Notice>This department&apos;s KPIs haven&apos;t been signed off by its lead yet.</Notice>}
          </div>

          {/* Metrics */}
          <section className="mt-6 bg-panel border border-line rounded overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-hair text-xs text-muted">
                <tr>
                  <th className="text-left font-medium px-4 py-2.5">Metric</th>
                  <th className="text-right font-medium px-3 py-2.5">Target</th>
                  <th className="text-right font-medium px-3 py-2.5">Actual</th>
                  <th className="text-right font-medium px-3 py-2.5">Weight</th>
                  <th className="text-right font-medium px-3 py-2.5">Score</th>
                  <th className="text-right font-medium px-3 py-2.5">Weighted</th>
                  <th className="text-left font-medium px-3 py-2.5">Status</th>
                  <th className="text-left font-medium px-3 py-2.5">Period</th>
                  <th className="text-left font-medium px-3 py-2.5">Last updated</th>
                  {canEdit && <th className="px-3 py-2.5"><span className="sr-only">Edit</span></th>}
                </tr>
              </thead>
              <tbody>
                {metrics.map((m) => (
                  <MetricRow key={m.id} m={m} canEdit={canEdit} updatedByName={nameOf(m.updated_by)} periodLabel={period.label} />
                ))}
                {!metrics.length && <tr><td colSpan={10} className="px-4 py-10 text-center text-muted">No metrics on this scorecard yet.</td></tr>}
              </tbody>
            </table>
          </section>
          {canEdit && <div className="mt-4"><AddMetricForm scorecardId={sc.id} /></div>}
        </>
      )}

      <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* History */}
        <section>
          <h2 className="font-serif text-lg mb-3">Recent changes</h2>
          {audit.length ? (
            <ol className="border-l border-line pl-4 space-y-3">
              {audit.map((a) => (
                <li key={a.id} className="text-sm">
                  <div>{a.summary}</div>
                  <div className="text-xs text-muted">
                    {db.user(a.actor_id)?.display_name ?? "Unknown"}, {new Date(a.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                  </div>
                </li>
              ))}
            </ol>
          ) : <p className="text-sm text-muted">No changes recorded yet.</p>}
        </section>

        {/* Admin: reporting line + details */}
        {canManageOrg(v) && (
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-panel border border-line rounded p-5">
            <div>
              <h2 className="font-serif text-lg mb-3">Assign managers</h2>
              <AssignManagerForm employeeId={emp.id} l1={emp.l1_manager_id} l2={emp.l2_manager_id}
                people={db.employees().filter((e) => e.status === "active").map((e) => ({ id: e.id, name: e.name, l1: e.l1_manager_id }))} />
            </div>
            <div>
              <h2 className="font-serif text-lg mb-3">Details</h2>
              <EmployeeDetailsForm employee={emp} departments={db.departments().map((d) => ({ id: d.id, name: d.name }))} />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
