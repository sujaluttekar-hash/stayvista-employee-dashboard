"use client";
import { useEffect, useState } from "react";
import type { ScorecardMetric } from "@/lib/data/types";
import { formatValue, metricScore, metricStatus, weightedScore } from "@/lib/scoring";
import { removeMetric, updateMetric } from "@/app/actions";
import { SourceTag, StatusPill, TypeBadge, scoreTone } from "./ui";
import { Result, Submit, inputCls, useAction } from "./forms";

export function MetricRow({ m, canEdit, updatedByName, periodLabel }: {
  m: ScorecardMetric; canEdit: boolean; updatedByName: string | null; periodLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useAction(updateMetric);
  const [removeState, removeAction] = useAction(removeMetric);
  useEffect(() => { if (state?.ok) setOpen(false); }, [state]);

  const score = metricScore(m);
  const weighted = weightedScore(m);
  const lowerBetter = m.direction === "lower_is_better";

  return (
    <>
      <tr className="border-t border-hair align-top">
        <td className="px-4 py-3 min-w-[220px]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{m.name}</span>
            <TypeBadge type={m.type} />
          </div>
          <div className="text-xs text-muted mt-0.5 leading-relaxed">{m.description}{lowerBetter && " · lower is better"}</div>
        </td>
        <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap">{formatValue(m.target, m.unit)}</td>
        <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap">
          {formatValue(m.actual, m.unit)}
          <SourceTag source={m.actual_source} />
        </td>
        <td className="px-3 py-3 text-right tabular-nums">{m.weight}%</td>
        <td className={`px-3 py-3 text-right tabular-nums ${scoreTone(score)}`}>{score ?? "—"}</td>
        <td className="px-3 py-3 text-right tabular-nums">{weighted ?? "—"}</td>
        <td className="px-3 py-3"><StatusPill status={metricStatus(m)} /></td>
        <td className="px-3 py-3 text-xs text-muted whitespace-nowrap">{periodLabel}</td>
        <td className="px-3 py-3 text-xs text-muted min-w-[120px]">
          {m.updated_at ? (
            <>
              {new Date(m.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              <div>{updatedByName ?? "—"}</div>
            </>
          ) : "—"}
        </td>
        {canEdit && (
          <td className="px-3 py-3 text-right">
            <button onClick={() => setOpen((o) => !o)} className="text-xs text-sky-deep hover:underline" aria-expanded={open}>
              {open ? "Close" : "Edit"}
            </button>
          </td>
        )}
      </tr>
      {canEdit && open && (
        <tr className="bg-warmwhite">
          <td colSpan={10} className="px-4 py-4">
            <form action={formAction} className="flex items-end gap-4 flex-wrap">
              <input type="hidden" name="metric_id" value={m.id} />
              <label className="w-28">
                <span className="block text-xs text-muted mb-1">Target ({m.unit})</span>
                <input name="target" defaultValue={m.target} inputMode="decimal" className={inputCls} />
              </label>
              {m.type === "manual" ? (
                <label className="w-28">
                  <span className="block text-xs text-muted mb-1">Actual ({m.unit})</span>
                  <input name="actual" defaultValue={m.actual ?? ""} inputMode="decimal" placeholder="Not set" className={inputCls} autoFocus />
                </label>
              ) : (
                <div className="w-56 text-xs text-muted pb-1.5">
                  Actual comes from the data source. {m.source_config?.query_id ? `Redash query #${m.source_config.query_id}.` : "No query linked yet."}
                </div>
              )}
              <label className="w-24">
                <span className="block text-xs text-muted mb-1">Weightage %</span>
                <input name="weight" defaultValue={m.weight} inputMode="decimal" className={inputCls} />
              </label>
              <Submit>Save</Submit>
              <Result state={state} />
            </form>
            <form action={removeAction} className="mt-3 flex items-center gap-3"
              onSubmit={(e) => { if (!confirm(`Remove “${m.name}” from this scorecard?`)) e.preventDefault(); }}>
              <input type="hidden" name="metric_id" value={m.id} />
              <Submit tone="danger">Remove metric</Submit>
              <Result state={removeState} />
            </form>
          </td>
        </tr>
      )}
    </>
  );
}
