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
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
          <Link href="/admin/setup" className="flex shrink-0 items-baseline gap-2.5">
            <span className="text-gilt font-display text-lg tracking-[0.08em]">RV</span>
            <span className="font-display text-xs uppercase tracking-[0.28em] text-gold-soft/70">
              Host Panel
            </span>
          </Link>
          <div className="order-last w-full min-w-0 overflow-x-auto sm:order-none sm:w-auto sm:flex-1 sm:overflow-visible">
            <div className="flex sm:justify-center">
              <AdminNav />
            </div>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
