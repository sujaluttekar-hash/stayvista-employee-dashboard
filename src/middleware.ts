import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes that require a specific role beyond "logged in".
// Everything else under /(dashboard) just requires *any* authenticated
// session — the actual data scoping (own team vs. org-wide) happens in
// Postgres via RLS, not here. This layer only stops the wrong ROLE from
// even loading a page shell it has no business seeing.
const ROLE_GATED: { prefix: string; roles: string[] }[] = [
  { prefix: "/hr", roles: ["hr"] },
  { prefix: "/data", roles: ["data"] },
  { prefix: "/my-team", roles: ["manager"] },
];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  if (!user && path !== "/login") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user) {
    const gate = ROLE_GATED.find((g) => path.startsWith(g.prefix));
    if (gate) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (!profile || !gate.roles.includes(profile.role)) {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
