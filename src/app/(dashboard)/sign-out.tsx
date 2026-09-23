"use client";
import { useRouter } from "next/navigation";

export default function SignOut() {
  const router = useRouter();
  return (
    <button
      className="underline mt-1"
      onClick={async () => { await fetch("/api/auth", { method: "DELETE" }); router.push("/login"); router.refresh(); }}
    >
      Switch view
    </button>
  );
}
