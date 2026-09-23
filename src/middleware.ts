import { NextResponse, type NextRequest } from "next/server";

// Only answers "is anyone signed in?". WHAT they can see is decided per
// page and per action by src/lib/auth/permissions.ts, because roles are
// derived from the org chart (who reports to whom), which lives in data.
const SESSION_COOKIE = "sv_demo_session";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === "/login" || path.startsWith("/api/auth")) return NextResponse.next();
  if (!request.cookies.get(SESSION_COOKIE)?.value) return NextResponse.redirect(new URL("/login", request.url));
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
