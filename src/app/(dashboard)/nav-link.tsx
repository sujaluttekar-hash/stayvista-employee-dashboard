"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, children, exact }: { href: string; children: React.ReactNode; exact?: boolean }) {
  const path = usePathname();
  const active = exact ? path === href : path === href || path.startsWith(href + "/");
  return (
    <Link href={href} aria-current={active ? "page" : undefined}
      className={`block px-3 py-1.5 rounded text-[13.5px] ${active ? "bg-white/10 text-[#FAF6EE]" : "hover:bg-white/5"}`}>
      {children}
    </Link>
  );
}
