"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-warmwhite">
      <form onSubmit={handleLogin} className="w-full max-w-sm bg-panel border border-line rounded p-8">
        <div className="font-serif text-2xl mb-1">Employee Dashboard</div>
        <div className="text-xs uppercase tracking-wide text-muted mb-6">StayVista</div>

        <label className="block text-xs text-muted mb-1">Email</label>
        <input
          className="w-full border border-line rounded px-3 py-2 mb-4 text-sm"
          type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
        />
        <label className="block text-xs text-muted mb-1">Password</label>
        <input
          className="w-full border border-line rounded px-3 py-2 mb-4 text-sm"
          type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
        />

        {error && <div className="text-bad text-xs mb-4">{error}</div>}

        <button
          type="submit" disabled={loading}
          className="w-full bg-bloom text-ink font-medium rounded py-2 text-sm"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>

        <div className="text-[11px] text-muted mt-4 leading-relaxed">
          Accounts are provisioned by HR. Your role (Manager / HR / Data) is
          set on your profile and determines what you can see and edit.
        </div>
      </form>
    </div>
  );
}
