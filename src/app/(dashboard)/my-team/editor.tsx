"use client";
import { useEffect, useState } from "react";
import type { Metric, Person } from "@/lib/mock-data";

const MONTHS = ["2026-04-01","2026-05-01","2026-06-01","2026-07-01","2026-08-01","2026-09-01"];
type Score = { actual: number; band: number; weighted: number };

// Preview mode: scores are saved in this browser only (localStorage).
// When Supabase returns, swap load/save for the `scores` table upsert.
const storeKey = (personId: string, month: string) => `sv-scores:${personId}:${month}`;
function load(personId: string, month: string): Record<string, Score> {
  try { return JSON.parse(localStorage.getItem(storeKey(personId, month)) ?? "{}"); } catch { return {}; }
}

export default function MyTeamEditor({ team, metricsByDept }: { team: Person[]; metricsByDept: Record<string, Metric[]> }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [month, setMonth] = useState(MONTHS[3]);
  const [scores, setScores] = useState<Record<string, Score>>({});
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const person = team.find((t) => t.id === selected);
  const metrics = person ? metricsByDept[person.department_slug] ?? [] : [];

  useEffect(() => { if (selected) setScores(load(selected, month)); }, [selected, month]);

  function saveScore(m: Metric, actual: number, band: number) {
    if (!selected) return;
    const next = { ...scores, [m.id]: { actual, band, weighted: +(band * m.weight).toFixed(3) } };
    setScores(next);
    try { localStorage.setItem(storeKey(selected, month), JSON.stringify(next)); } catch {}
    setSavedAt(new Date().toLocaleTimeString());
  }

  return (
    <div className="p-8">
      <h1 className="font-serif text-2xl mb-1">My team — edit scores</h1>
      <div className="text-sm text-muted mb-6">
        Preview mode: edits are saved on this device only until the database is connected.
      </div>

      <div className="flex gap-6">
        <div className="w-64 flex-none bg-panel border border-line rounded overflow-hidden">
          {team.map((p) => (
            <button key={p.id} onClick={() => setSelected(p.id)}
              className={`w-full text-left px-4 py-2.5 text-sm border-b border-hair last:border-0 ${selected === p.id ? "bg-bloom-bg" : ""}`}>
              {p.name}
              <div className="text-xs text-muted">{p.role_title}</div>
            </button>
          ))}
          {!team.length && <div className="p-4 text-xs text-muted">No direct reports on your profile yet.</div>}
        </div>

        <div className="flex-1">
          {!person ? (
            <div className="text-sm text-muted">Select a team member to edit their scorecard.</div>
          ) : (
            <div className="bg-panel border border-line rounded p-5">
              <select value={month} onChange={(e) => setMonth(e.target.value)} className="border border-line rounded px-2 py-1 text-sm mb-4">
                {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              {metrics.map((m) => {
                const existing = scores[m.id];
                return (
                  <div key={`${m.id}-${selected}-${month}`} className="flex items-center justify-between py-2 border-b border-hair last:border-0 text-sm">
                    <div>
                      <div className="font-medium">{m.name}</div>
                      <div className="text-xs text-muted">{m.definition}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input defaultValue={existing?.actual ?? ""} placeholder="actual"
                        className="w-20 border border-line rounded px-2 py-1 text-center text-xs"
                        onBlur={(e) => { const a = parseFloat(e.target.value); if (!isNaN(a)) saveScore(m, a, existing?.band ?? 3); }} />
                      <select defaultValue={existing?.band ?? 3} className="border border-line rounded px-1 py-1 text-xs"
                        onChange={(e) => saveScore(m, existing?.actual ?? 0, parseInt(e.target.value))}>
                        {[1,2,3,4,5].map((b) => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                  </div>
                );
              })}
              {savedAt && <div className="text-xs text-muted mt-2">Saved at {savedAt}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
