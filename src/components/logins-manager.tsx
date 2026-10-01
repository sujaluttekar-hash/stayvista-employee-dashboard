"use client";
import { useEffect, useState } from "react";

type Login = { id: string; display_name: string; role: "hr" | "manager" | "data"; email: string };

export function LoginsManager() {
  const [logins, setLogins] = useState<Login[] | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"hr" | "manager" | "data">("manager");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicLink, setMagicLink] = useState<string | null>(null);

  function load() {
    fetch("/api/admin/logins")
      .then((r) => r.json())
      .then(setLogins)
      .catch(() => setError("Couldn't load logins"));
  }
  useEffect(load, []);

  async function addLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMagicLink(null);
    const res = await fetch("/api/admin/logins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, display_name: name, role, password: password || undefined }),
    });
    const body = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(body.error ?? "Could not add login");
      return;
    }
    setEmail("");
    setName("");
    setPassword("");
    setMagicLink(body.magicLink);
    load();
  }

  async function removeLogin(id: string) {
    if (!confirm("Remove this login? They will no longer be able to sign in.")) return;
    await fetch("/api/admin/logins", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  return (
    <div className="border border-line rounded p-5">
      <h2 className="font-serif text-lg">Logins</h2>
      <p className="text-xs text-muted mt-1">
        Only emails added here can sign in. Nobody else can create an account — sign-up is off.
      </p>

      <form onSubmit={addLogin} className="mt-4 flex flex-wrap gap-2 items-end">
        <div>
          <label className="text-xs text-muted block">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-line rounded px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted block">Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border border-line rounded px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted block">Password (optional)</label>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Leave blank for a sign-in link"
            className="border border-line rounded px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted block">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as typeof role)}
            className="border border-line rounded px-2 py-1.5 text-sm"
          >
            <option value="hr">HR</option>
            <option value="manager">Manager</option>
            <option value="data">Data team</option>
          </select>
        </div>
        <button type="submit" disabled={busy} className="bg-ink text-warmwhite rounded px-4 py-1.5 text-sm disabled:opacity-50">
          {busy ? "Adding…" : "Add login"}
        </button>
      </form>

      {error && <div className="text-bad text-xs mt-2">{error}</div>}
      {magicLink && (
        <div className="text-xs mt-3 p-3 bg-sky-bg/50 border border-line rounded break-all">
          Share this one-time sign-in link with them:
          <br />
          <a href={magicLink} className="underline">{magicLink}</a>
        </div>
      )}

      <div className="mt-4 space-y-1">
        {logins === null && <div className="text-xs text-muted">Loading…</div>}
        {logins?.map((l) => (
          <div key={l.id} className="flex items-center justify-between text-sm border-b border-line/50 py-1.5">
            <div>
              <span className="font-medium">{l.display_name}</span>{" "}
              <span className="text-xs text-muted">{l.email} · {l.role}</span>
            </div>
            <button onClick={() => removeLogin(l.id)} className="text-xs text-bad underline">
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
