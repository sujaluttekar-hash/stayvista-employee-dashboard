import type { ReviewPeriod } from "@/lib/data/types";

export function currentPeriod(periods: ReviewPeriod[], today = new Date()) {
  const iso = today.toISOString().slice(0, 10);
  return periods.find((p) => p.starts <= iso && iso <= p.ends) ?? periods[0];
}

export function resolvePeriod(periods: ReviewPeriod[], requested?: string) {
  return periods.find((p) => p.id === requested) ?? currentPeriod(periods);
}
