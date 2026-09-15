"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function RedashSyncPage() {
  const supabase = createClient();
  const [departments, setDepartments] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [log, setLog] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("departments").select("*").order("name").then(({ data }) => setDepartments(data ?? []));
    supabase.from("redash_sync_log").select("*").order("run_at", { ascending: false }).limit(20)
      .then(({ data }) => setLog(data ?? []));
  }, []);

  async function sync(departmentId: string) {
    setBusy(departmentId);
    const res = await fetch("/api/redash/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ departmentId }),
    });
    const result = await res.json();
    setBusy(null);
    alert(res.ok ? `Synced ${result.synced} rows` : `Failed: ${result.error}`);
  }

  return (
    <div className="p-8">
      <h1 className="font-serif text-2xl mb-1">Redash sync</h1>
      <div className="text-sm text-muted mb-6">
        Pulls live actuals from each department's Redash query into `scores`
        (source = redash). A department needs its <code>redash_query_id</code> set
        before it can sync — that's a data-role edit on the departments table.
      </div>

      <div className="bg-panel border border-line rounded divide-y divide-hair mb-8">
        {departments.map((d) => (
          <div key={d.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <div>
              <div className="font-medium">{d.name}</div>
              <div className="text-xs text-muted">
                {d.redash_query_id ? `Query #${d.redash_query_id}` : "No Redash query wired up yet"}
              </div>
            </div>
            <button
              disabled={!d.redash_query_id || busy === d.id}
              onClick={() => sync(d.id)}
              className="text-xs px-3 py-1.5 rounded bg-bloom text-ink disabled:opacity-40"
            >
              {busy === d.id ? "Syncing…" : "Sync now"}
            </button>
          </div>
        ))}
      </div>

      <h2 className="font-serif text-lg mb-2">Recent syncs</h2>
      <div className="bg-panel border border-line rounded overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-hair uppercase tracking-wide text-muted">
            <tr><th className="text-left px-3 py-2">When</th><th className="text-left px-3 py-2">Status</th><th className="text-left px-3 py-2">Rows</th><th className="text-left px-3 py-2">Error</th></tr>
          </thead>
          <tbody>
            {log.map((l) => (
              <tr key={l.id} className="border-t border-hair">
                <td className="px-3 py-2">{new Date(l.run_at).toLocaleString()}</td>
                <td className="px-3 py-2">{l.status}</td>
                <td className="px-3 py-2">{l.rows_synced ?? "—"}</td>
                <td className="px-3 py-2 text-bad">{l.error_message ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
