"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const MONTHS = ["2026-04-01","2026-05-01","2026-06-01","2026-07-01","2026-08-01","2026-09-01"];

export default function MyTeamPage() {
  const supabase = createClient();
  const [team, setTeam] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [month, setMonth] = useState(MONTHS[3]);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [scores, setScores] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  // "my team" = whatever `people` rows RLS lets this manager see —
  // policy `manager reads own team` already filters this for us.
  useEffect(() => {
    supabase.from("people").select("*").order("name").then(({ data }) => setTeam(data ?? []));
  }, []);

  useEffect(() => {
    if (!selected) return;
    (async () => {
      const person = team.find((t) => t.id === selected);
      const { data: templates } = await supabase
        .from("scorecard_templates")
        .select("id, scorecard_metrics(*)")
        .eq("department_id", person.department_id)
        .eq("is_active", true)
        .limit(1)
        .single();
      setMetrics(templates?.scorecard_metrics ?? []);

      const { data: existing } = await supabase
        .from("scores").select("*").eq("person_id", selected).eq("month", month);
      const byMetric: Record<string, any> = {};
      existing?.forEach((s) => (byMetric[s.metric_id] = s));
      setScores(byMetric);
    })();
  }, [selected, month]);

  async function saveScore(metricId: string, actual: number, band: number, weight: number) {
    setSaving(true);
    await supabase.from("scores").upsert(
      {
        person_id: selected,
        month,
        metric_id: metricId,
        actual,
        band,
        weighted: +(band * weight).toFixed(3),
        source: "manager_override",
      },
      { onConflict: "person_id,month,metric_id" }
    );
    setSaving(false);
  }

  return (
    <div className="p-8">
      <h1 className="font-serif text-2xl mb-1">My team — edit scores</h1>
      <div className="text-sm text-muted mb-6">
        This list and every save below is scoped by the database, not the
        UI — you physically cannot write a score for someone who isn't your
        direct report; RLS rejects the write.
      </div>

      <div className="flex gap-6">
        <div className="w-64 flex-none bg-panel border border-line rounded overflow-hidden">
          {team.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelected(p.id)}
              className={`w-full text-left px-4 py-2.5 text-sm border-b border-hair last:border-0 ${selected === p.id ? "bg-bloom-bg" : ""}`}
            >
              {p.name}
              <div className="text-xs text-muted">{p.role_title}</div>
            </button>
          ))}
          {!team.length && <div className="p-4 text-xs text-muted">No direct reports on your profile yet.</div>}
        </div>

        <div className="flex-1">
          {!selected ? (
            <div className="text-sm text-muted">Select a team member to edit their scorecard.</div>
          ) : (
            <div className="bg-panel border border-line rounded p-5">
              <select value={month} onChange={(e) => setMonth(e.target.value)} className="border border-line rounded px-2 py-1 text-sm mb-4">
                {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>

              {metrics.map((m) => {
                const existing = scores[m.id];
                return (
                  <div key={m.id} className="flex items-center justify-between py-2 border-b border-hair last:border-0 text-sm">
                    <div>
                      <div className="font-medium">{m.name}</div>
                      <div className="text-xs text-muted">{m.definition}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        defaultValue={existing?.actual ?? ""}
                        placeholder="actual"
                        className="w-20 border border-line rounded px-2 py-1 text-center text-xs"
                        onBlur={(e) => {
                          const actual = parseFloat(e.target.value);
                          if (isNaN(actual)) return;
                          // NOTE: band-scoring formula is per-metric (see
                          // the Hearth prototype's `score()` functions) —
                          // TODO port those in once real KPIs land per
                          // department. Placeholder: manager sets band directly.
                          saveScore(m.id, actual, existing?.band ?? 3, m.weight);
                        }}
                      />
                      <select
                        defaultValue={existing?.band ?? 3}
                        className="border border-line rounded px-1 py-1 text-xs"
                        onChange={(e) => saveScore(m.id, existing?.actual ?? 0, parseInt(e.target.value), m.weight)}
                      >
                        {[1,2,3,4,5].map((b) => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                  </div>
                );
              })}
              {saving && <div className="text-xs text-muted mt-2">Saving…</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
