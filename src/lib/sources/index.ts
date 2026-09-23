import "server-only";
// ─────────────────────────────────────────────────────────────────────
// Automatic metric connectors.
//
// Each automatic metric has a source_config. A sync asks the matching
// connector for the value for (employee, period). Connectors return
// null when they have nothing — the metric then stays "Awaiting data".
//
// To go live with Redash:
//   1. set REDASH_BASE_URL + REDASH_API_KEY
//   2. set source_config.query_id on the metric
//   3. the query must return rows with: employee_no, period_id, <value_column>
//
// DEMO values: only produced when an admin explicitly runs a DEMO sync.
// They are stored with actual_source = "demo" and labelled in the UI.
// ─────────────────────────────────────────────────────────────────────
import { fetchRedashQuery } from "@/lib/redash";
import type { Employee, ReviewPeriod, ScorecardMetric, ActualSource } from "@/lib/data/types";

export type SourceResult =
  | { ok: true; value: number; source: ActualSource }
  | { ok: false; reason: string };

export function redashConfigured() {
  return !!(process.env.REDASH_BASE_URL && process.env.REDASH_API_KEY);
}

async function fromRedash(m: ScorecardMetric, e: Employee, p: ReviewPeriod): Promise<SourceResult> {
  const cfg = m.source_config;
  if (!cfg?.query_id) return { ok: false, reason: "No Redash query linked to this metric yet" };
  if (!redashConfigured()) return { ok: false, reason: "Redash credentials not set on the server" };
  const rows = await fetchRedashQuery(cfg.query_id);
  const row = rows.find((r) => String(r.employee_no) === e.employee_no && String(r.period_id) === p.id);
  const value = row ? Number(row[cfg.value_column]) : NaN;
  if (!row || Number.isNaN(value)) return { ok: false, reason: `No row for ${e.employee_no} / ${p.id} in query #${cfg.query_id}` };
  return { ok: true, value, source: "redash" };
}

// Deterministic, plausible-looking value near target. Clearly flagged as demo.
function demoValue(m: ScorecardMetric, e: Employee): SourceResult {
  let h = 0;
  for (const c of m.id + e.id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const swing = ((h % 25) - 15) / 100; // −15% … +9%
  const factor = m.direction === "lower_is_better" ? 1 - swing : 1 + swing;
  const raw = m.target * factor;
  const value = m.unit === "%" ? Math.min(100, Math.round(raw * 10) / 10) : Math.round(raw * 10) / 10;
  return { ok: true, value, source: "demo" };
}

export async function fetchAutomaticValue(m: ScorecardMetric, e: Employee, p: ReviewPeriod, mode: "live" | "demo"): Promise<SourceResult> {
  if (m.type !== "automatic") return { ok: false, reason: "Not an automatic metric" };
  if (mode === "demo") return demoValue(m, e);
  return fromRedash(m, e, p);
}
