"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Try the temporary fixed-account fallback FIRST — see
    // src/lib/auth/session.ts. This must win even if a real Supabase
    // account with this email exists but has no app_users row (which
    // would otherwise silently bounce back to /login with no error).
    const fb = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (fb.ok) {
      setLoading(false);
      router.push("/");
      router.refresh();
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (!error) {
      router.push("/");
      router.refresh();
      return;
    }
    setError(error.message === "Invalid login credentials" ? "Wrong email or password." : error.message);
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

        {error && <div className="text-bad text-xs mt-3">{error}</div>}
        <p className="text-[11px] text-muted mt-5 leading-relaxed">
          Only emails added under Management → Logins can sign in. Ask HR or the Data team for access.
        </p>
      </div>
    </div>
  );
}
