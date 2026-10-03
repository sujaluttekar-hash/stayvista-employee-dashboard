import "server-only";
// ─────────────────────────────────────────────────────────────────────
// Automatic metric connectors.
//
// Each automatic metric has a source_config. A sync asks the connector for
// the value for (employee, month). When there's nothing, the metric stays
// "Awaiting data".
//
// To go live with Redash:
//   1. set REDASH_BASE_URL + REDASH_API_KEY on the server
//   2. set source_config.query_id on the metric
//   3. the query returns one row per employee per MONTH, with columns:
//        employee_no   e.g. EMP-004
//        period_id     the month as YYYY-MM  ("period" or "month" also work;
//                      a full date such as 2026-09-01 is fine, only the
//                      year and month are read)
//        value         the number (or whatever source_config.value_column names)
//
// A query is fetched ONCE per sync and shared by every metric that uses it.
// ─────────────────────────────────────────────────────────────────────
import { fetchRedashQuery, type RedashRow } from "@/lib/redash";
import type { Employee, ReviewPeriod, ScorecardMetric, ActualSource } from "@/lib/data/types";

export type SourceResult =
  | { ok: true; value: number; source: ActualSource }
  | { ok: false; reason: string };

export function redashConfigured() {
  return !!(process.env.REDASH_BASE_URL && process.env.REDASH_API_KEY);
}

const normNo = (v: unknown) => String(v ?? "").trim().toUpperCase();

// "2026-09", "2026-09-01" or "2026-09-01T00:00:00Z" all mean September 2026.
function rowMonth(r: RedashRow): string | null {
  const raw = r.period_id ?? r.period ?? r.month;
  const m = String(raw ?? "").match(/^(\d{4})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}` : null;
}

// One of these per sync run: loads each query once, remembers failures, so
// 50 people × 4 metrics on the same query is ONE Redash call, not 200.
export function createSyncSession() {
  const cache = new Map<number, Promise<{ rows: RedashRow[] } | { error: string }>>();
  const load = (queryId: number) => {
    if (!cache.has(queryId)) {
      cache.set(queryId, fetchRedashQuery(queryId).then(
        (rows) => ({ rows }),
        (e: any) => ({ error: e?.message ?? "Redash request failed" }),
      ));
    }
    return cache.get(queryId)!;
  };
  return {
    // Fetch every distinct query up front, in parallel.
    preload: (ids: number[]) => Promise.all(Array.from(new Set(ids)).map(load)),
    value: async (m: ScorecardMetric, e: Employee, p: ReviewPeriod): Promise<SourceResult> => {
      const cfg = m.source_config;
      if (!cfg?.query_id) return { ok: false, reason: "No Redash query linked yet" };
      if (!redashConfigured()) return { ok: false, reason: "Redash credentials not set on the server" };
      const res = await load(cfg.query_id);
      if ("error" in res) return { ok: false, reason: `Query #${cfg.query_id}: ${res.error}` };
      if (res.rows.length && !res.rows.some((r) => rowMonth(r))) {
        return { ok: false, reason: `Query #${cfg.query_id} has no period_id / month column` };
      }
      const col = cfg.value_column || "value";
      const row = res.rows.find((r) => normNo(r.employee_no) === normNo(e.employee_no) && rowMonth(r) === p.id);
      if (!row) return { ok: false, reason: `Query #${cfg.query_id} has no row for some people in ${p.label}` };
      const value = Number(String(row[col] ?? "").replace(/,/g, ""));
      if (row[col] == null || row[col] === "" || Number.isNaN(value)) {
        return { ok: false, reason: `Query #${cfg.query_id}: column "${col}" is empty or not a number` };
      }
      return { ok: true, value, source: "redash" };
    },
  };
}
