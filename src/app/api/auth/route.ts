import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/data/store";
import { SESSION_COOKIE } from "@/lib/auth/session";

const DESCRIPTION = {
  hr: "Manage employees, departments and reporting lines",
  manager: "Add metrics and update scorecards",
  data: "Full access, including data sources",
};

// PREVIEW login: three role logins, no password. Replace with Supabase Auth.
export async function GET() {
  return NextResponse.json(db.users().map((u) => ({ id: u.id, name: u.display_name, description: DESCRIPTION[u.role] })));
}

export async function POST(req: NextRequest) {
  const { userId } = await req.json();
  if (!db.user(userId)) return NextResponse.json({ error: "Unknown login" }, { status: 400 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, userId, { httpOnly: true, sameSite: "lax", path: "/" });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
