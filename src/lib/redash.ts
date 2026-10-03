import "server-only";
// Redash API helper. Server only: never import this from a Client Component.
// Redash's API returns a job/result envelope; pollJob handles the case where
// the query has to actually run before results are ready.

export type RedashRow = Record<string, string | number | null>;

const base = () => (process.env.REDASH_BASE_URL ?? "").replace(/\/+$/, "");
const headers = () => ({ Authorization: `Key ${process.env.REDASH_API_KEY}` });
const timeout = () => AbortSignal.timeout(20_000);

// Redash job statuses: 1 queued, 2 running, 3 finished, 4 failed, 5 cancelled.
async function pollJob(jobId: string): Promise<number> {
  for (let i = 0; i < 30; i++) {
    const res = await fetch(`${base()}/api/jobs/${jobId}`, { headers: headers(), signal: timeout() });
    if (!res.ok) throw new Error(`Redash job check failed (${res.status})`);
    const { job } = await res.json();
    if (job.status === 3) return job.query_result_id;
    if (job.status === 4) throw new Error(job.error || "Redash query failed");
    if (job.status === 5) throw new Error("Redash query was cancelled");
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("Redash query took longer than 30 seconds");
}

async function latestCachedRows(queryId: number): Promise<RedashRow[]> {
  const res = await fetch(`${base()}/api/queries/${queryId}/results.json`, { headers: headers(), signal: timeout() });
  if (!res.ok) throw new Error(`Redash result fetch failed (${res.status})`);
  const { query_result } = await res.json();
  return query_result.rows as RedashRow[];
}

export async function fetchRedashQuery(queryId: number): Promise<RedashRow[]> {
  if (!base() || !process.env.REDASH_API_KEY) {
    throw new Error("REDASH_BASE_URL / REDASH_API_KEY not set");
  }

  // Ask Redash to run the query fresh rather than trusting a stale cache.
  const refresh = await fetch(`${base()}/api/queries/${queryId}/refresh`, { method: "POST", headers: headers(), signal: timeout() });
  if (!refresh.ok) {
    // 401/403/404 mean the key can't see or run this query: say so plainly.
    if ([401, 403, 404].includes(refresh.status)) throw new Error(`Redash says no access to query #${queryId} (${refresh.status})`);
    // Anything else (e.g. a query with parameters can't be refreshed this way):
    // fall back to the most recent saved result instead of failing the sync.
    return latestCachedRows(queryId);
  }
  const { job } = await refresh.json();
  const resultId = await pollJob(job.id);

  const res = await fetch(`${base()}/api/queries/${queryId}/results/${resultId}.json`, { headers: headers(), signal: timeout() });
  if (!res.ok) throw new Error(`Redash result fetch failed (${res.status})`);
  const { query_result } = await res.json();
  return query_result.rows as RedashRow[];
}
