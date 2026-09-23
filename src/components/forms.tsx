"use client";
import { useFormState, useFormStatus } from "react-dom";
import { useEffect, useState } from "react";
import type { ActionState } from "@/app/actions";

type Action = (s: ActionState, f: FormData) => Promise<ActionState>;

export function useAction(action: Action) {
  return useFormState(action, null);
}

export function Submit({ children, tone = "primary", className = "" }: { children: React.ReactNode; tone?: "primary" | "quiet" | "danger"; className?: string }) {
  const { pending } = useFormStatus();
  const styles = {
    primary: "bg-ink text-warmwhite hover:bg-ink/90",
    quiet: "border border-line text-ink hover:bg-hair",
    danger: "text-bad hover:bg-bad-bg",
  }[tone];
  return (
    <button type="submit" disabled={pending} className={`text-xs px-3 py-1.5 rounded disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-deep ${styles} ${className}`}>
      {pending ? "Saving…" : children}
    </button>
  );
}

export function Result({ state }: { state: ActionState }) {
  const [shown, setShown] = useState(state);
  useEffect(() => {
    setShown(state);
    if (state?.ok) {
      const t = setTimeout(() => setShown(null), 3500);
      return () => clearTimeout(t);
    }
  }, [state]);
  if (!shown) return null;
  return <span role="status" className={`text-xs ${shown.error ? "text-bad" : "text-good"}`}>{shown.error ?? shown.ok}</span>;
}

export const inputCls = "w-full border border-line rounded px-2.5 py-1.5 text-sm bg-panel focus:outline-none focus:border-sky-deep";
export const labelCls = "block text-xs text-muted mb-1";

// One-button forms (reset, sync, clear…)
export function ActionButton({ action, children, fields = {}, tone = "quiet", confirm }: {
  action: Action; children: React.ReactNode; fields?: Record<string, string>; tone?: "primary" | "quiet" | "danger"; confirm?: string;
}) {
  const [state, formAction] = useAction(action);
  return (
    <form action={formAction} className="flex items-center gap-3 flex-wrap"
      onSubmit={(e) => { if (confirm && !window.confirm(confirm)) e.preventDefault(); }}>
      {Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <Submit tone={tone}>{children}</Submit>
      <Result state={state} />
    </form>
  );
}
