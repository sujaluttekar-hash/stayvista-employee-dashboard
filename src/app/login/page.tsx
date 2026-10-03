"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const NO_ACCESS =
  "This email hasn't been given access. Ask HR or the Data team to add it under Management → Logins.";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The middleware sends people back here with ?reason=… when it stops them.
  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get("reason");
    if (reason === "denied") setError(NO_ACCESS);
    if (reason === "unavailable") setError("We couldn't check your access just now. Please try again in a moment.");
    if (reason === "config") setError("This copy of the app isn't fully set up yet (its Supabase settings are missing). Please tell the Data team.");
  }, []);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (authError || !data.user) {
      setLoading(false);
      setError(
        authError?.message === "Invalid login credentials" ? "Wrong email or password." : authError?.message ?? "Could not sign in."
      );
      return;
    }

    // Only emails registered under Management → Logins may continue.
    const { data: registered } = await supabase.from("app_users").select("id").eq("id", data.user.id).maybeSingle();
    if (!registered) {
      await supabase.auth.signOut();
      setLoading(false);
      setError(NO_ACCESS);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-warmwhite p-4">
      <div className="w-full max-w-md bg-panel border border-line rounded p-8">
        <div className="font-serif text-2xl">Employee Dashboard</div>
        <div className="text-xs text-muted mt-0.5 mb-6">StayVista</div>

        <form onSubmit={signIn} className="space-y-3">
          <div>
            <label className="text-xs text-muted">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full border border-line rounded px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-deep"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="text-xs text-muted">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full border border-line rounded px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-deep"
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ink text-warmwhite rounded px-4 py-2 text-sm disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {error && <div role="alert" className="text-bad text-xs mt-3">{error}</div>}
        <p className="text-[11px] text-muted mt-5 leading-relaxed">
          Only emails added under Management → Logins can sign in. Ask HR or the Data team for access.
        </p>
      </div>
    </div>
  );
}
