"use client";
import { useState } from "react";
import { DEPARTMENTS } from "@/lib/departments";
import { REDASH_QUERY_IDS } from "@/lib/mock-data";

type LogRow = { at: string; dept: string; status: string; rows?: number; error?: string };

export default function RedashSyncPage() {
  const [busy, setBusy] = useState<string | null>(null);
  const [log, setLog] = useState<LogRow[]>([]);

  async function sync(slug: string, name: string) {
    setBusy(slug);
    const res = await fetch("/api/redash/sync", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ departmentSlug: slug }),
    });
    const r = await res.json();
    setBusy(null);
    setLog((l) => [{ at: new Date().toLocaleString(), dept: name, status: res.ok ? "success" : "error", rows: r.rowsFetched, error: r.error }, ...l].slice(0, 20));
  }

  return (
    <div className="p-8">
      <h1 className="font-serif text-2xl mb-1">Redash sync</h1>
      <div className="text-sm text-muted mb-6">
        Preview mode: a sync fetches rows from Redash and reports the count, but
        nothing is stored until the database is connected. Set a query ID per
        department in <code>src/lib/mock-data.ts</code>.
      </div>

      <div className="bg-panel border border-line rounded divide-y divide-hair mb-8">
        {DEPARTMENTS.map((d) => {
          const qid = REDASH_QUERY_IDS[d.slug];
          return (
            <div key={d.slug} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <div className="font-medium">{d.name}</div>
                <div className="text-xs text-muted">{qid ? `Query #${qid}` : "No Redash query wired up yet"}</div>
              </div>
              <button disabled={!qid || busy === d.slug} onClick={() => sync(d.slug, d.name)}
                className="text-xs px-3 py-1.5 rounded bg-bloom text-ink disabled:opacity-40">
                {busy === d.slug ? "Syncing…" : "Sync now"}
              </button>
            </div>
          );
        })}
      </div>

      <h2 className="font-serif text-lg mb-2">Syncs this session</h2>
      <div className="bg-panel border border-line rounded overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-hair uppercase tracking-wide text-muted">
            <tr><th className="text-left px-3 py-2">When</th><th className="text-left px-3 py-2">Department</th><th className="text-left px-3 py-2">Status</th><th className="text-left px-3 py-2">Rows</th><th className="text-left px-3 py-2">Error</th></tr>
          </thead>
          <tbody>
            {log.map((l, i) => (
              <tr key={i} className="border-t border-hair">
                <td className="px-3 py-2">{l.at}</td><td className="px-3 py-2">{l.dept}</td>
                <td className="px-3 py-2">{l.status}</td><td className="px-3 py-2">{l.rows ?? "—"}</td>
                <td className="px-3 py-2 text-bad">{l.error ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
