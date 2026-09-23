"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Option = { id: string; name: string; description: string };

export default function LoginPage() {
  const router = useRouter();
  const [options, setOptions] = useState<Option[] | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth").then((r) => r.json()).then(setOptions).catch(() => setError("Couldn't load preview users"));
  }, []);

  async function signIn(userId: string) {
    setLoading(userId); setError(null);
    const res = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }) });
    if (!res.ok) { setLoading(null); setError("Could not sign in"); return; }
    router.push("/"); router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-warmwhite p-4">
      <div className="w-full max-w-md bg-panel border border-line rounded p-8">
        <div className="font-serif text-2xl">Employee Dashboard</div>
        <div className="text-xs text-muted mt-0.5 mb-6">StayVista preview</div>

        <p className="text-sm mb-3">Sign in as:</p>
        {!options && !error && <div className="text-xs text-muted">Loading…</div>}
        <div className="space-y-2">
          {options?.map((o) => (
            <button key={o.id} onClick={() => signIn(o.id)} disabled={!!loading}
              className="w-full text-left border border-line rounded px-4 py-3 hover:bg-sky-bg/50 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-deep">
              <div className="text-sm font-medium">{loading === o.id ? "Opening…" : o.name}</div>
              <div className="text-xs text-muted mt-0.5">{o.description}</div>
            </button>
          ))}
        </div>

        {error && <div className="text-bad text-xs mt-3">{error}</div>}
        <p className="text-[11px] text-muted mt-5 leading-relaxed">
          Preview mode has no passwords, so anyone with the link can pick any login. Real sign-in comes with Supabase.
        </p>
      </div>
    </div>
  );
}
