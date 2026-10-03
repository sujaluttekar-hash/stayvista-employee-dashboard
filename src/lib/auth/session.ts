import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppUser, Role } from "@/lib/data/types";

export type Viewer = { user: AppUser; role: Role };

// Who is signed in?
//
// The ONLY way in is an email added under Management → Logins. That
// creates a Supabase Auth user AND a row in app_users. A session whose
// user has no app_users row (for example someone who somehow created a
// Supabase account on their own) is treated as signed out here, and is
// also stopped earlier in src/middleware.ts.
export async function getViewer(): Promise<Viewer | null> {
  const supabase = createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return null;

  const { data: appUser } = await supabase
    .from("app_users")
    .select("id, display_name, role")
    .eq("id", authUser.id)
    .maybeSingle();
  if (!appUser) return null;

  const user: AppUser = { id: appUser.id, display_name: appUser.display_name, role: appUser.role as Role };
  return { user, role: user.role };
}

export async function requireViewer(): Promise<Viewer> {
  const v = await getViewer();
  if (!v) redirect("/login");
  return v;
}
