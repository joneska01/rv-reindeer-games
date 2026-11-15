"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Re-run the page's server components every `ms` so a panel that only changes
 * when OTHER people act (e.g. phones casting costume ballots) stays current.
 * Skips ticks while the tab is hidden and refreshes once when it returns.
 */
export function useAutoRefresh(ms: number) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const id = setInterval(tick, ms);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router, ms]);
}
