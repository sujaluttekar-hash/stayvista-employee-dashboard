import { NextResponse, type NextRequest } from "next/server";

// Temporary: demo-cookie gating while Supabase is removed.
// Role -> route gating is kept identical to the Supabase version.
const SESSION_COOKIE = "sv_demo_session";
const ROLE_BY_USER: Record<string, string> = { "u-manager": "manager", "u-hr": "hr", "u-data": "data" };
const ROLE_GATED: { prefix: string; roles: string[] }[] = [
  { prefix: "/hr", roles: ["hr"] },
  { prefix: "/data", roles: ["data"] },
  { prefix: "/my-team", roles: ["manager"] },
];

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === "/login" || path.startsWith("/api/auth")) return NextResponse.next();

  const role = ROLE_BY_USER[request.cookies.get(SESSION_COOKIE)?.value ?? ""];
  if (!role) return NextResponse.redirect(new URL("/login", request.url));

  const gate = ROLE_GATED.find((g) => path.startsWith(g.prefix));
  if (gate && !gate.roles.includes(role)) return NextResponse.redirect(new URL("/", request.url));

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
