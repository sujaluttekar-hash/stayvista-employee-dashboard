import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/data/store";
import type { AppUser, Role } from "@/lib/data/types";

export const SESSION_COOKIE = "sv_demo_session";

export type Viewer = { user: AppUser; role: Role };

// PREVIEW: the cookie holds one of three role logins — no password.
// With Supabase this becomes supabase.auth.getUser() → app_users.role.
export function getViewer(): Viewer | null {
  const user = db.user(cookies().get(SESSION_COOKIE)?.value);
  return user ? { user, role: user.role } : null;
}

export function requireViewer(): Viewer {
  const v = getViewer();
  if (!v) redirect("/login");
  return v;
}
