"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/admin/setup", label: "Setup" },
  { href: "/admin/library", label: "Library" },
  { href: "/admin/live", label: "Live Event" },
  { href: "/admin/closing", label: "Closing" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1">
      {LINKS.map((l) => {
        const active = pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "rounded-pill px-4 py-1.5 font-display text-xs uppercase tracking-[0.18em] transition-colors",
              active
                ? "bg-gold/15 text-gold-soft"
                : "text-cream/55 hover:bg-panel/60 hover:text-cream",
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
