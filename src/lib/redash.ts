// Server-only helper. Never import this from a Client Component.
// Redash's own API returns a job/result envelope; poll_job handles the
// case where the query needs to actually run before results are ready.

type RedashRow = Record<string, string | number | null>;

async function pollJob(baseUrl: string, apiKey: string, jobId: string) {
  for (let i = 0; i < 15; i++) {
    const res = await fetch(`${baseUrl}/api/jobs/${jobId}`, {
      headers: { Authorization: `Key ${apiKey}` },
    });
    const data = await res.json();
    if (data.job.status === 3) return data.job.query_result_id;
    if (data.job.status === 4) throw new Error(data.job.error || "Redash job failed");
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("Redash job timed out after 15s");
}

export async function fetchRedashQuery(queryId: number): Promise<RedashRow[]> {
  const baseUrl = process.env.REDASH_BASE_URL!;
  const apiKey = process.env.REDASH_API_KEY!;
  if (!baseUrl || !apiKey) {
    throw new Error("REDASH_BASE_URL / REDASH_API_KEY not set — see .env.example");
  }

  // Trigger a fresh run rather than trusting a stale cached result.
  const refreshRes = await fetch(`${baseUrl}/api/queries/${queryId}/refresh`, {
    method: "POST",
    headers: { Authorization: `Key ${apiKey}` },
  });
  if (!refreshRes.ok) throw new Error(`Redash refresh failed: ${refreshRes.status}`);
  const { job } = await refreshRes.json();

  const resultId = await pollJob(baseUrl, apiKey, job.id);

  const resultRes = await fetch(`${baseUrl}/api/queries/${queryId}/results/${resultId}.json`, {
    headers: { Authorization: `Key ${apiKey}` },
  });
  if (!resultRes.ok) throw new Error(`Redash result fetch failed: ${resultRes.status}`);
  const { query_result } = await resultRes.json();
  return query_result.rows as RedashRow[];
}

// Expected Redash row shape (per-department query), one row per
// person × month × metric — this is the contract the "data" role's
// Redash query needs to satisfy. TODO: confirm exact column names once
// each department's real query exists; adjust the mapping in
// /api/redash/sync accordingly.
export type ExpectedRedashRow = {
  employee_no: string;
  month: string;      // 'YYYY-MM-01'
  metric_key: string; // must match scorecard_metrics.key
  actual: number;
};
