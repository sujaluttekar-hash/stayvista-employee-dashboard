// Scoring rules — pure functions, safe on client and server.
//
// Two ways a metric can be scored (metric.scoring):
//
//  LINEAR (default)  score 0-100 = achievement vs target, capped at 100
//                      higher-is-better: actual / target
//                      lower-is-better:  at or under target = 100, else target / actual
//  RATED             a manager types a 0-5 score (metric.rating), exactly like the
//                    sheet-based scorecards. Internally that is rating x 20 (%), so
//                    both kinds can sit on one scorecard.
//
//  Weighted score    = score x weight / 100
//  Overall           = weighted average of the metrics that HAVE a score (coverage is
//                      shown separately so missing data doesn't silently drag it down)
//  Scale             = "five" when every weighted metric is RATED: the overall is then
//                      shown out of 5 (same as the sheet). Otherwise out of 100.
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

type Scorable = Pick<ScorecardMetric, "actual" | "target" | "direction"> & Partial<Pick<ScorecardMetric, "scoring" | "rating">>;

export const isRated = (m: Pick<ScorecardMetric, "scoring">) => m.scoring === "rated";

// Score as a PERCENT (0-100), or null when there is nothing to score yet.
export function metricScore(m: Scorable): number | null {
  if (isRated(m)) return m.rating == null ? null : Math.max(0, Math.min(100, Math.round(m.rating * 20 * 10) / 10));
  if (m.actual == null) return null;
  let ratio: number;
  if (m.direction === "lower_is_better") {
    // At or under target = full marks (this also covers a target of 0, e.g.
    // "0 complaints"). Over target scales down; over a target of 0 scores 0.
    ratio = m.actual <= m.target ? 1 : m.target / m.actual;
  } else {
    if (!m.target) return null; // can't measure achievement against a target of 0
    ratio = m.actual / m.target;
  }
  return Math.max(0, Math.min(100, Math.round(ratio * 1000) / 10));
}

// What the Score column shows: the 0-5 rating for rated metrics, the 0-100 score otherwise.
export function displayScore(m: ScorecardMetric): number | null {
  return isRated(m) ? (m.rating ?? null) : metricScore(m);
}

// Percent-points contributed to a 0-100 overall (used for averaging).
export function weightedScore(m: ScorecardMetric) {
  const s = metricScore(m);
  return s == null ? null : Math.round(s * m.weight) / 100;
}

// What the Weighted column shows: rating x weight / 100 (e.g. 0.40) for rated
// metrics, like the sheet; percent-points for linear ones.
export function weightedDisplay(m: ScorecardMetric): number | null {
  if (isRated(m)) return m.rating == null ? null : Math.round(m.rating * m.weight) / 100;
  return weightedScore(m);
}

export function metricStatus(m: ScorecardMetric): MetricStatus {
  if (isRated(m)) {
    if (m.rating == null) return m.type === "automatic" ? "awaiting_data" : "not_started";
    if (m.rating >= 5) return "achieved";
    if (m.rating >= 4) return "on_track";
    if (m.rating >= 3) return "in_progress";
    return "behind";
  }
  const s = metricScore(m);
  if (s == null) return m.type === "automatic" ? "awaiting_data" : "not_started";
  if (s >= 100) return "achieved";
  if (s >= 90) return "on_track";
  if (s >= 70) return "in_progress";
  return "behind";
}

export type Overall = {
  score: number | null;   // to DISPLAY, on `max`
  percent: number | null; // always 0-100: use for colours and for averaging across people
  max: 5 | 100;
  scale: "five" | "hundred";
  coverage: number;
  totalWeight: number;
  weightOk: boolean;
};

export function overall(metrics: ScorecardMetric[]): Overall {
  const totalWeight = metrics.reduce((a, m) => a + m.weight, 0);
  const scored = metrics.filter((m) => metricScore(m) != null);
  const scoredWeight = scored.reduce((a, m) => a + m.weight, 0);
  const weighted = metrics.filter((m) => m.weight > 0);
  const five = weighted.length > 0 && weighted.every(isRated);

  let percent: number | null = null;
  let score: number | null = null;
  if (scoredWeight) {
    if (five) {
      const s5 = scored.reduce((a, m) => a + (m.rating ?? 0) * m.weight, 0) / scoredWeight; // 0-5
      score = Math.round(s5 * 100) / 100;
      percent = Math.round(s5 * 20 * 10) / 10;
    } else {
      const sum = scored.reduce((a, m) => a + (metricScore(m) ?? 0) * m.weight, 0);
      percent = Math.round((sum / scoredWeight) * 10) / 10;
      score = percent;
    }
  }
  return {
    score, percent,
    max: five ? 5 : 100,
    scale: five ? "five" : "hundred",
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
