// Presentational bits shared by server and client components (no hooks).
import type { MetricType, ActualSource } from "@/lib/data/types";
import { STATUS_LABEL, type MetricStatus } from "@/lib/scoring";

export function TypeBadge({ type }: { type: MetricType }) {
  return type === "automatic" ? (
    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-sky-bg text-sky-deep whitespace-nowrap" title="Filled from a connected data source">
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden><path d="M1 5a4 4 0 0 1 7-2.6M9 5a4 4 0 0 1-7 2.6M8 1v1.6H6.4M2 9V7.4h1.6" fill="none" stroke="currentColor" strokeWidth="1.2" /></svg>
      Automatic
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-shine-bg text-shine-deep whitespace-nowrap" title="Entered by the manager">
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden><path d="M1.5 8.5 2 6.5 6.8 1.7l1.5 1.5L3.5 8z" fill="none" stroke="currentColor" strokeWidth="1.2" /></svg>
      Manual
    </span>
  );
}

const STATUS_STYLE: Record<MetricStatus, string> = {
  achieved: "bg-good-bg text-good",
  on_track: "bg-good-bg text-good",
  in_progress: "bg-warn-bg text-warn",
  behind: "bg-bad-bg text-bad",
  not_started: "bg-hair text-muted",
  awaiting_data: "bg-hair text-muted",
};

export function StatusPill({ status }: { status: MetricStatus }) {
  return <span className={`text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>;
}

export function SourceTag({ source }: { source: ActualSource | null }) {
  if (source === "demo")
    return <span className="ml-1.5 text-[10px] px-1.5 py-px rounded border border-warn/40 text-warn" title="Placeholder generated for testing — not real data">Demo</span>;
  if (source === "redash") return <span className="ml-1.5 text-[10px] text-muted">via Redash</span>;
  return null;
}

export function Notice({ tone = "warn", children }: { tone?: "warn" | "info"; children: React.ReactNode }) {
  const cls = tone === "warn" ? "bg-warn-bg text-warn border-warn/20" : "bg-sky-bg text-sky-deep border-sky/40";
  return <div className={`text-xs rounded px-4 py-3 border ${cls}`}>{children}</div>;
}

export function scoreTone(score: number | null) {
  if (score == null) return "text-muted";
  if (score >= 90) return "text-good";
  if (score >= 70) return "text-warn";
  return "text-bad";
}

export function initials(name: string) {
  return name.replace(/\(.*?\)/g, "").trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}
