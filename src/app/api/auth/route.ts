import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Real sign-out: clears the Supabase session cookie.
export async function DELETE() {
  const supabase = createClient();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
