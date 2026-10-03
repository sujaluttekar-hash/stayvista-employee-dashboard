import Link from "next/link";
import type { ReviewPeriod } from "@/lib/data/types";
import { currentPeriod } from "@/lib/periods";

// Month switcher: ‹ September 2026 ›  [This month]
// A server component made of plain links, so it needs no JavaScript and
// keeps working however many months get added. `basePath` is the page it
// sits on; any extra query params are carried through via `keep`.
export function PeriodSwitcher({ periods, active, basePath, keep = {} }: {
  periods: ReviewPeriod[]; active: ReviewPeriod; basePath: string; keep?: Record<string, string | undefined>;
}) {
  const i = periods.findIndex((p) => p.id === active.id);
  const prev = i > 0 ? periods[i - 1] : null;
  const next = i >= 0 && i < periods.length - 1 ? periods[i + 1] : null;
  const now = currentPeriod(periods);
  const href = (p: ReviewPeriod) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(keep)) if (v) q.set(k, v);
    q.set("period", p.id);
    return `${basePath}?${q.toString()}`;
  };
  const btn = "w-8 h-8 grid place-items-center rounded border border-line text-sm";
  return (
    <nav className="flex items-center gap-2" aria-label="Review month">
      {prev ? <Link href={href(prev)} className={`${btn} hover:bg-hair`} aria-label={`Previous month, ${prev.label}`}>‹</Link>
        : <span className={`${btn} opacity-30`} aria-hidden>‹</span>}
      <span className="min-w-[9.5rem] text-center text-sm font-medium" aria-current="date">{active.label}</span>
      {next ? <Link href={href(next)} className={`${btn} hover:bg-hair`} aria-label={`Next month, ${next.label}`}>›</Link>
        : <span className={`${btn} opacity-30`} aria-hidden>›</span>}
      {active.id !== now.id && <Link href={href(now)} className="text-xs underline text-muted ml-1">Back to {now.label}</Link>}
    </nav>
  );
}
