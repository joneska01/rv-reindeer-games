import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AdminNav } from "@/components/admin/AdminNav";
import { LogoutButton } from "@/components/admin/LogoutButton";

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session.isAdmin) redirect("/admin/login");

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-gilt bg-forest-deep/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <Link href="/admin/setup" className="flex items-baseline gap-2.5">
            <span className="text-gilt font-display text-lg tracking-[0.08em]">RV</span>
            <span className="font-display text-xs uppercase tracking-[0.28em] text-gold-soft/70">
              Host Panel
            </span>
          </Link>
          <AdminNav />
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
