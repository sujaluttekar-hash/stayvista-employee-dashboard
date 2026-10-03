import Link from "next/link";
import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/auth/session";
import { canRunSync } from "@/lib/auth/permissions";
import { db, hydrateStore } from "@/lib/data/store";
import { resolvePeriod } from "@/lib/periods";
import { redashConfigured } from "@/lib/sources";
import { ActionButton } from "@/components/forms";
import { PeriodSwitcher } from "@/components/period-switcher";
import { clearDemoValues, syncAutomatic } from "@/app/actions";

// A sync can take a while (it waits for Redash to run each query).
export const maxDuration = 60;

export default async function DataSourcesPage({ searchParams }: { searchParams: { period?: string } }) {
  const v = await requireViewer();
  if (!canRunSync(v)) notFound();
  await hydrateStore();
  const period = resolvePeriod(db.periods(), searchParams.period);
  const auto = db.scorecards().filter((s) => s.period_id === period.id).flatMap((sc) =>
    db.metrics(sc.id).filter((m) => m.type === "automatic").flatMap((m) => {
      const e = db.employee(sc.employee_id);
      return e ? [{ m, e }] : [];
    }));
  const linked = auto.filter((x) => x.m.source_config?.query_id).length;
  const synced = auto.filter((x) => x.m.actual != null && x.m.actual_source === "redash").length;
  const leftoverDemo = db.scorecards().reduce((n, sc) => n + db.metrics(sc.id).filter((m) => m.actual_source === "demo").length, 0);
  const connected = redashConfigured();

  return (
    <div className="p-6 md:p-8 max-w-[1000px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-serif text-3xl">Data sources</h1>
        <PeriodSwitcher periods={db.periods()} active={period} basePath="/admin/data-sources" />
      </div>
      <p className="text-sm text-muted mt-1">How automatic metrics get their numbers for {period.label}.</p>

      <dl className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-panel border border-line rounded p-4"><dt className="text-xs text-muted">Redash connection</dt>
          <dd className={`mt-1 font-medium ${connected ? "text-good" : "text-bad"}`}>{connected ? "Credentials set" : "Not connected"}</dd></div>
        <div className="bg-panel border border-line rounded p-4"><dt className="text-xs text-muted">Linked to a query</dt>
          <dd className="mt-1 font-medium tabular-nums">{linked} of {auto.length}</dd></div>
        <div className="bg-panel border border-line rounded p-4"><dt className="text-xs text-muted">Filled from Redash</dt>
          <dd className="mt-1 font-medium tabular-nums">{synced} of {auto.length}</dd></div>
      </dl>

      <section className="mt-8">
        <h2 className="font-serif text-lg">Sync {period.label}</h2>
        <p className="text-sm text-muted mb-3">
          Pulls each linked metric from Redash for this month. Each query runs once and is shared by everyone who uses it.
          Metrics without a query, and people who have left, are skipped. Values that haven&apos;t changed are left alone.
        </p>
        <ActionButton action={syncAutomatic} tone="primary" fields={{ period_id: period.id }}>Sync {period.label} from Redash</ActionButton>
      </section>

      <h2 className="font-serif text-lg mt-10 mb-3">Automatic metrics, {period.label}</h2>
      <div className="bg-panel border border-line rounded overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-hair text-xs text-muted"><tr>
            <th className="text-left font-medium px-4 py-2.5">Metric</th><th className="text-left font-medium px-4 py-2.5">Employee</th>
            <th className="text-left font-medium px-4 py-2.5">Redash query</th><th className="text-left font-medium px-4 py-2.5">Current value</th>
          </tr></thead>
          <tbody>
            {auto.map(({ m, e }) => (
              <tr key={m.id} className="border-t border-hair">
                <td className="px-4 py-2.5">{m.name}</td>
                <td className="px-4 py-2.5"><Link href={`/employees/${e.id}?period=${period.id}`} className="hover:underline">{e.name}</Link></td>
                <td className="px-4 py-2.5 text-muted">{m.source_config?.query_id ? `#${m.source_config.query_id}` : "Not linked"}</td>
                <td className="px-4 py-2.5 text-muted">{m.actual == null ? "Awaiting data" : m.actual_source === "demo" ? "Demo value (clear it)" : "Live"}</td>
              </tr>
            ))}
            {!auto.length && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted">No automatic metrics on any {period.label} scorecard yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted mt-3">
        To link a query, set <code>source_config.query_id</code> on the metric. The query must return one row per employee per month with
        <code> employee_no</code>, <code>period_id</code> (YYYY-MM, or any date in that month) and <code>value</code>.
      </p>

      {leftoverDemo > 0 && (
        <section className="mt-10 border-t border-line pt-6">
          <h2 className="font-serif text-lg">Old demo values</h2>
          <p className="text-sm text-muted mb-3">{leftoverDemo} placeholder value{leftoverDemo === 1 ? "" : "s"} from the old preview are still in the data. They aren&apos;t real. Clear them.</p>
          <ActionButton action={clearDemoValues} tone="danger" confirm="Clear all old demo values?">Clear all demo values</ActionButton>
        </section>
      )}
    </div>
  );
}
