import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { FALLBACK_EMAIL, FALLBACK_PASSWORD } from "@/lib/auth/session";

const FALLBACK_COOKIE = "sv_fallback";

// Temporary fallback login for one fixed account while real Supabase
// auth is being debugged. See src/lib/auth/session.ts — REMOVE once
// Supabase login is confirmed working.
export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (email !== FALLBACK_EMAIL || password !== FALLBACK_PASSWORD) {
    return NextResponse.json({ error: "Wrong email or password." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(FALLBACK_COOKIE, "1", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return res;
}

// Real sign-out: clears both the Supabase session and the fallback cookie.
export async function DELETE() {
  const supabase = createClient();
  await supabase.auth.signOut();
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(FALLBACK_COOKIE);
  return res;
}
