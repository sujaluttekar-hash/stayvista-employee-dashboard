import Link from "next/link";
import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/auth/session";
import { canRunSync } from "@/lib/auth/permissions";
import { db } from "@/lib/data/store";
import { currentPeriod } from "@/lib/periods";
import { redashConfigured } from "@/lib/sources";
import { ActionButton } from "@/components/forms";
import { Notice } from "@/components/ui";
import { clearDemoValues, resetPreview, syncAutomatic } from "@/app/actions";

export default function DataSourcesPage() {
  const v = requireViewer();
  if (!canRunSync(v)) notFound();
  const period = currentPeriod(db.periods());
  const auto = db.scorecards().filter((s) => s.period_id === period.id).flatMap((sc) =>
    db.metrics(sc.id).filter((m) => m.type === "automatic").map((m) => ({ m, e: db.employee(sc.employee_id)! })));
  const linked = auto.filter((x) => x.m.source_config?.query_id).length;
  const demo = auto.filter((x) => x.m.actual_source === "demo").length;
  const connected = redashConfigured();

  return (
    <div className="p-6 md:p-8 max-w-[1000px]">
      <h1 className="font-serif text-3xl">Data sources</h1>
      <p className="text-sm text-muted mt-1">How automatic metrics get their numbers for {period.label}.</p>

      <dl className="mt-6 grid grid-cols-3 gap-4">
        <div className="bg-panel border border-line rounded p-4"><dt className="text-xs text-muted">Redash connection</dt>
          <dd className={`mt-1 font-medium ${connected ? "text-good" : "text-bad"}`}>{connected ? "Credentials set" : "Not connected"}</dd></div>
        <div className="bg-panel border border-line rounded p-4"><dt className="text-xs text-muted">Automatic metrics linked to a query</dt>
          <dd className="mt-1 font-medium tabular-nums">{linked} of {auto.length}</dd></div>
        <div className="bg-panel border border-line rounded p-4"><dt className="text-xs text-muted">Showing demo values</dt>
          <dd className={`mt-1 font-medium tabular-nums ${demo ? "text-warn" : ""}`}>{demo}</dd></div>
      </dl>

      <section className="mt-8 space-y-6">
        <div>
          <h2 className="font-serif text-lg">Live sync</h2>
          <p className="text-sm text-muted mb-3">Pulls each linked metric from Redash. Metrics without a query are skipped and stay “Awaiting data”.</p>
          <ActionButton action={syncAutomatic} tone="primary" fields={{ mode: "live", period_id: period.id }}>Sync from Redash</ActionButton>
        </div>
        <div>
          <h2 className="font-serif text-lg">Demo values for testing</h2>
          <p className="text-sm text-muted mb-3">Fills empty automatic metrics with placeholder numbers so you can see scoring end to end. Every demo value is tagged “Demo” wherever it appears. Clear them before sharing scores with anyone.</p>
          <div className="flex flex-wrap gap-6">
            <ActionButton action={syncAutomatic} fields={{ mode: "demo", period_id: period.id }}>Fill with demo values</ActionButton>
            <ActionButton action={clearDemoValues} tone="danger">Clear all demo values</ActionButton>
          </div>
        </div>
      </section>

      <h2 className="font-serif text-lg mt-10 mb-3">Automatic metrics</h2>
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
                <td className="px-4 py-2.5"><Link href={`/employees/${e.id}`} className="hover:underline">{e.name}</Link></td>
                <td className="px-4 py-2.5 text-muted">{m.source_config?.query_id ? `#${m.source_config.query_id}` : "Not linked"}</td>
                <td className="px-4 py-2.5 text-muted">{m.actual == null ? "Awaiting data" : m.actual_source === "demo" ? "Demo value" : "Live"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted mt-3">To link a query, set <code>source_config.query_id</code> on the metric. The query must return <code>employee_no</code>, <code>period_id</code> and <code>value</code>.</p>

      <section className="mt-10 border-t border-line pt-6">
        <h2 className="font-serif text-lg">Reset preview</h2>
        <p className="text-sm text-muted mb-3">Puts every employee, manager assignment and scorecard back to the starting sample data.</p>
        <Notice>This wipes all edits made in preview mode.</Notice>
        <div className="mt-3"><ActionButton action={resetPreview} tone="danger" confirm="Reset all preview data? Every edit will be lost.">Reset preview data</ActionButton></div>
      </section>
    </div>
  );
}
