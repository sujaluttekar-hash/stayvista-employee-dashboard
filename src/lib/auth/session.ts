import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/data/store";
import type { AppUser, Employee } from "@/lib/data/types";

export const SESSION_COOKIE = "sv_demo_session";

export type Viewer = {
  user: AppUser;
  employee: Employee | null;
  isAdmin: boolean;
  isManager: boolean; // derived: has at least one direct report
};

// PREVIEW: the cookie holds a user id picked on the login screen — no
// password. With Supabase this becomes supabase.auth.getUser() + a
// lookup of app_users by auth id. Everything downstream stays the same.
export function getViewer(): Viewer | null {
  const user = db.user(cookies().get(SESSION_COOKIE)?.value);
  if (!user) return null;
  const employee = db.employee(user.employee_id);
  return {
    user,
    employee,
    isAdmin: user.is_admin,
    isManager: employee ? db.directReports(employee.id).length > 0 : false,
  };
}

export function requireViewer(): Viewer {
  const v = getViewer();
  if (!v) redirect("/login");
  return v;
}
