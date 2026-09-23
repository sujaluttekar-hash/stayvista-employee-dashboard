import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/session";
import { REDASH_QUERY_IDS } from "@/lib/mock-data";
import { departmentBySlug } from "@/lib/departments";
import { fetchRedashQuery } from "@/lib/redash";

// POST /api/redash/sync   body: { departmentSlug: string }
// Preview mode: fetches + validates rows, does NOT persist them.
// When Supabase returns, restore the upsert into `scores` + `redash_sync_log`.
export async function POST(req: NextRequest) {
  const profile = getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (profile.role !== "data") {
    return NextResponse.json({ error: "Only the Data role can trigger a sync" }, { status: 403 });
  }

  const { departmentSlug } = await req.json();
  const dept = departmentBySlug(departmentSlug);
  const queryId = REDASH_QUERY_IDS[departmentSlug];
  if (!dept || !queryId) {
    return NextResponse.json({ error: `No Redash query wired up for ${dept?.name ?? departmentSlug} yet` }, { status: 400 });
  }

  try {
    const rows = await fetchRedashQuery(queryId);
    const valid = rows.filter((r) => r.employee_no && r.month && r.metric_key && r.actual != null);
    return NextResponse.json({ ok: true, rowsFetched: rows.length, validRows: valid.length, persisted: false });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
