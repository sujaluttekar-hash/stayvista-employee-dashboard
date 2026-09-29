import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppUser, Role } from "@/lib/data/types";

export type Viewer = { user: AppUser; role: Role };

// Real Supabase Auth: a session only exists for emails that have been
// added as a login (Management → Logins) and matched to a row in
// app_users. Anyone else's session — even a valid Supabase account with
// no app_users row — is treated as signed out.
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
    .single();
  if (!appUser) return null;

  const user: AppUser = { id: appUser.id, display_name: appUser.display_name, role: appUser.role as Role };
  return { user, role: user.role };
}

export async function requireViewer(): Promise<Viewer> {
  const v = await getViewer();
  if (!v) redirect("/login");
  return v;
}
