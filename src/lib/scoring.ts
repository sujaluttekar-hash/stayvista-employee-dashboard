// Scoring rules — pure functions, safe on client and server.
//
//   Score (0–100)   = achievement vs target, capped at 100
//                     higher-is-better: actual / target
//                     lower-is-better:  target / actual (actual 0 → 100)
//   Weighted score  = score × weight / 100
//   Overall score   = Σ weighted ÷ Σ weight of metrics WITH an actual × 100
//                     (so missing data doesn't silently drag the score down —
//                      coverage is shown separately)
//
// ASSUMPTION: linear scoring with a 100 cap. Swap in per-metric banding
// here if HR defines bands (e.g. 90% of target = 3/5).
import type { ScorecardMetric } from "@/lib/data/types";

export type MetricStatus = "achieved" | "on_track" | "in_progress" | "behind" | "not_started" | "awaiting_data";

export const STATUS_LABEL: Record<MetricStatus, string> = {
  achieved: "Achieved",
  on_track: "On track",
  in_progress: "In progress",
  behind: "Behind",
  not_started: "Not started",
  awaiting_data: "Awaiting data",
};

export function metricScore(m: Pick<ScorecardMetric, "actual" | "target" | "direction">): number | null {
  if (m.actual == null || !m.target) return null;
  const ratio = m.direction === "lower_is_better" ? (m.actual === 0 ? 1 : m.target / m.actual) : m.actual / m.target;
  return Math.max(0, Math.min(100, Math.round(ratio * 1000) / 10));
}

export function weightedScore(m: ScorecardMetric) {
  const s = metricScore(m);
  return s == null ? null : Math.round(s * m.weight) / 100;
}

export function metricStatus(m: ScorecardMetric): MetricStatus {
  const s = metricScore(m);
  if (s == null) return m.type === "automatic" ? "awaiting_data" : "not_started";
  if (s >= 100) return "achieved";
  if (s >= 90) return "on_track";
  if (s >= 70) return "in_progress";
  return "behind";
}

export function overall(metrics: ScorecardMetric[]) {
  const totalWeight = metrics.reduce((a, m) => a + m.weight, 0);
  const scored = metrics.filter((m) => metricScore(m) != null);
  const scoredWeight = scored.reduce((a, m) => a + m.weight, 0);
  const weightedSum = scored.reduce((a, m) => a + (weightedScore(m) ?? 0), 0);
  return {
    score: scoredWeight ? Math.round((weightedSum / scoredWeight) * 1000) / 10 : null,
    coverage: totalWeight ? Math.round((scoredWeight / totalWeight) * 100) : 0,
    totalWeight,
    weightOk: Math.abs(totalWeight - 100) < 0.01,
  };
}

export function formatValue(v: number | null, unit: ScorecardMetric["unit"]) {
  if (v == null) return "—";
  const n = Number.isInteger(v) ? v : v.toFixed(1);
  if (unit === "%") return `${n}%`;
  if (unit === "days") return `${n} ${v === 1 ? "day" : "days"}`;
  if (unit === "hours") return `${n} hrs`;
  if (unit === "score") return `${n} / 5`;
  return `${n}`;
}
