"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button
      onClick={logout}
      disabled={pending}
      className={cn(
        "font-display text-xs uppercase tracking-[0.18em] text-sage/70",
        "transition-colors hover:text-cranberry-bright disabled:opacity-50",
      )}
    >
      {pending ? "Leaving…" : "Sign out"}
    </button>
  );
}
