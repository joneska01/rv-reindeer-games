"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Shared fetch helper for live-console mutations: tracks busy/error and
 *  refreshes server data on success so every panel recomputes from the engine. */
export function useApi() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function call(url: string, init: RequestInit): Promise<boolean> {
    setError(null);
    setBusy(true);
    const res = await fetch(url, init);
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
      return false;
    }
    router.refresh();
    return true;
  }

  return { call, busy, error, setError };
}

export const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
