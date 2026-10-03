import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// The front door. A request gets through only if the person is signed in
// AND their email has been registered under Management → Logins (i.e. they
// have a row in app_users). WHAT they can then see or do is decided per
// page and per action by src/lib/auth/permissions.ts.
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === "/login" || path.startsWith("/api/auth")) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const isApi = path.startsWith("/api/");
  const toLogin = (reason?: string) => {
    if (isApi) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    const url = new URL("/login", request.url);
    if (reason) url.searchParams.set("reason", reason);
    const redirect = NextResponse.redirect(url);
    // keep any cookie changes (e.g. the sign-out below) on the redirect
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return toLogin();

  // Allow-list check: must be a registered login. Each person can read
  // their own app_users row under the table's RLS policy.
  const { data: registered, error } = await supabase
    .from("app_users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (error) return toLogin("unavailable"); // fail closed, but don't sign anyone out over a blip
  if (!registered) {
    await supabase.auth.signOut();
    return toLogin("denied");
  }
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
