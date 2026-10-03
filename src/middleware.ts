import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// The front door. A request gets through only if the person is signed in
// AND their email has been registered under Management → Logins (i.e. they
// have a row in app_users). WHAT they can then see or do is decided per
// page and per action by src/lib/auth/permissions.ts.
//
// This function must NEVER throw: an uncaught error here shows Vercel's
// "500 MIDDLEWARE_INVOCATION_FAILED" page to everyone. Anything unexpected
// is logged and the person is sent to /login with a plain explanation.
// It always fails CLOSED: nobody is let in because something went wrong.
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === "/login" || path.startsWith("/api/auth")) return NextResponse.next();

  const isApi = path.startsWith("/api/");
  const toLogin = (reason?: string, carry?: NextResponse) => {
    if (isApi) return NextResponse.json({ error: reason === "denied" ? "No access" : "Not signed in" }, { status: reason ? 403 : 401 });
    const url = new URL("/login", request.url);
    if (reason) url.searchParams.set("reason", reason);
    const res = NextResponse.redirect(url);
    // keep any cookie changes (e.g. the sign-out below) on the redirect
    carry?.cookies.getAll().forEach((c) => res.cookies.set(c.name, c.value, c));
    return res;
  };

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) {
      console.error("MIDDLEWARE: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are not set for this deployment. Add them in Vercel → Settings → Environment Variables (for this environment) and redeploy.");
      return toLogin("config");
    }

    let response = NextResponse.next({ request });
    const supabase = createServerClient(url, key, {
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
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return toLogin(undefined, response);

    // Allow-list check: must be a registered login. Each person can read
    // their own app_users row under the table's RLS policy.
    const { data: registered, error } = await supabase.from("app_users").select("id").eq("id", user.id).maybeSingle();
    if (error) {
      console.error("MIDDLEWARE: could not check app_users:", error.message);
      return toLogin("unavailable", response); // fail closed, but don't sign anyone out over a blip
    }
    if (!registered) {
      await supabase.auth.signOut();
      return toLogin("denied", response);
    }
    return response;
  } catch (e: any) {
    console.error("MIDDLEWARE: unexpected failure:", e?.message ?? e);
    return toLogin("unavailable");
  }
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
