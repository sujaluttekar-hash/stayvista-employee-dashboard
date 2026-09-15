import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { fetchRedashQuery } from "@/lib/redash";

// POST /api/redash/sync   body: { departmentId: string }
// Auth check uses the user's own session (RLS-scoped) purely to confirm
// they're role='data'. The actual writes use the service-role client so
// a sync is never blocked by RLS — and every write is stamped
// source='redash' + logged to redash_sync_log for audit.
export async function POST(req: NextRequest) {
  const { departmentId } = await req.json();

  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: profile } = await userClient
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "data") {
    return NextResponse.json({ error: "Only the Data role can trigger a sync" }, { status: 403 });
  }

  const svc = createServiceClient();
  const { data: dept } = await svc
    .from("departments").select("*").eq("id", departmentId).single();

  if (!dept?.redash_query_id) {
    return NextResponse.json(
      { error: `No Redash query wired up for ${dept?.name ?? departmentId} yet` },
      { status: 400 }
    );
  }

  try {
    const rows = await fetchRedashQuery(dept.redash_query_id);
    let synced = 0;

    for (const row of rows) {
      const employeeNo = row["employee_no"] as string;
      const month = row["month"] as string;
      const metricKey = row["metric_key"] as string;
      const actual = row["actual"] as number;
      if (!employeeNo || !month || !metricKey || actual == null) continue;

      const { data: person } = await svc
        .from("people").select("id").eq("employee_no", employeeNo).single();
      if (!person) continue;

      const { data: metric } = await svc
        .from("scorecard_metrics")
        .select("id, weight")
        .eq("key", metricKey)
        .single();
      if (!metric) continue;

      // NOTE: band-scoring logic (actual -> 1..5) is per-metric and lives
      // client-side in the Hearth prototype today. TODO once real
      // department KPIs land: port each metric's score() function here
      // so a synced `actual` also computes `band`/`weighted` server-side.
      await svc.from("scores").upsert(
        {
          person_id: person.id,
          month,
          metric_id: metric.id,
          actual,
          source: "redash",
        },
        { onConflict: "person_id,month,metric_id" }
      );
      synced++;
    }

    await svc.from("redash_sync_log").insert({
      department_id: departmentId,
      query_id: dept.redash_query_id,
      run_by: user.id,
      status: "success",
      rows_synced: synced,
    });

    return NextResponse.json({ ok: true, synced });
  } catch (err: any) {
    await svc.from("redash_sync_log").insert({
      department_id: departmentId,
      query_id: dept.redash_query_id,
      run_by: user.id,
      status: "error",
      error_message: err.message,
    });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
