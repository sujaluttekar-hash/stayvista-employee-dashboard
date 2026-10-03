import type { ReviewPeriod } from "@/lib/data/types";

// Scorecards run MONTH TO MONTH. A review period id is always "YYYY-MM"
// (e.g. "2026-10"). Anything else in the review_periods table (an old
// quarterly row, say) is ignored by the app — see isMonthly().

export const MONTH_ID = /^\d{4}-(0[1-9]|1[0-2])$/;
export const isMonthly = (p: Pick<ReviewPeriod, "id">) => MONTH_ID.test(p.id);

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// "Today" in India (YYYY-MM-DD). StayVista runs on IST; using UTC would
// show the previous month for the first 5½ hours of every month.
export function todayInIndia(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export const monthIdOf = (isoDate: string) => isoDate.slice(0, 7);

// Build the period for any "YYYY-MM" id.
export function monthPeriod(id: string): ReviewPeriod {
  const [y, m] = id.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const mm = String(m).padStart(2, "0");
  return { id, label: `${MONTHS[m - 1]} ${y}`, starts: `${y}-${mm}-01`, ends: `${y}-${mm}-${String(last).padStart(2, "0")}` };
}

// The month `offset` months from `id` (negative = earlier).
export function shiftMonth(id: string, offset: number): string {
  const [y, m] = id.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + offset, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function currentPeriod(periods: ReviewPeriod[], today = new Date()): ReviewPeriod {
  const iso = todayInIndia(today);
  const hit = periods.find((p) => p.starts <= iso && iso <= p.ends);
  if (hit) return hit;
  // No period covers today (e.g. the table hasn't been extended yet): use the
  // most recent one that has started, never silently jump back to January.
  const started = periods.filter((p) => p.starts <= iso);
  return started[started.length - 1] ?? periods[0] ?? monthPeriod(monthIdOf(iso));
}

export function resolvePeriod(periods: ReviewPeriod[], requested?: string): ReviewPeriod {
  return periods.find((p) => p.id === requested) ?? currentPeriod(periods);
}
