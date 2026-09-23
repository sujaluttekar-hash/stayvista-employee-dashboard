"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const OPTIONS = [
  { id: "u-manager", label: "Manager", hint: "Sees and edits own team only" },
  { id: "u-hr", label: "HR", hint: "Org-wide roster, status only" },
  { id: "u-data", label: "Data", hint: "Runs Redash syncs" },
];

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(userId: string) {
    setLoading(userId); setError(null);
    const res = await fetch("/api/auth", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setLoading(null);
    if (!res.ok) { setError("Could not sign in"); return; }
    router.push("/"); router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-warmwhite">
      <div className="w-full max-w-sm bg-panel border border-line rounded p-8">
        <div className="font-serif text-2xl mb-1">Employee Dashboard</div>
        <div className="text-xs uppercase tracking-wide text-muted mb-6">StayVista · Preview mode</div>

        <div className="text-xs text-muted mb-3">Choose a view to preview:</div>
        {OPTIONS.map((o) => (
          <button
            key={o.id} onClick={() => signIn(o.id)} disabled={!!loading}
            className="w-full text-left border border-line rounded px-4 py-3 mb-2 hover:bg-bloom-bg disabled:opacity-50"
          >
            <div className="text-sm font-medium">{loading === o.id ? "Opening…" : o.label}</div>
            <div className="text-[11px] text-muted">{o.hint}</div>
          </button>
        ))}

        {error && <div className="text-bad text-xs mt-2">{error}</div>}

        <div className="text-[11px] text-muted mt-4 leading-relaxed">
          Preview mode uses sample data. Real sign-in returns when the
          database is connected.
        </div>
      </div>
    </div>
  );
}
