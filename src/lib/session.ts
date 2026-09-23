import { cookies } from "next/headers";
import { userById } from "./mock-data";

export const SESSION_COOKIE = "sv_demo_session";

// Temporary demo session — a cookie holding a demo user id.
// NOT secure auth. Replace with Supabase Auth when it is re-added.
export function getCurrentProfile() {
  return userById(cookies().get(SESSION_COOKIE)?.value);
}
