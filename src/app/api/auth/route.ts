import { NextRequest, NextResponse } from "next/server";
import { userById } from "@/lib/mock-data";
import { SESSION_COOKIE } from "@/lib/session";

export async function POST(req: NextRequest) {
  const { userId } = await req.json();
  if (!userById(userId)) return NextResponse.json({ error: "Unknown demo user" }, { status: 400 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, userId, { httpOnly: true, sameSite: "lax", path: "/" });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
