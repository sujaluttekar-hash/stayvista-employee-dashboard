import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Sign out. (Signing in happens in the browser via Supabase Auth — see
// src/app/login/page.tsx. There is no other way to get a session.)
export async function DELETE() {
  const supabase = createClient();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
