"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Shared fetch helper for admin mutations: tracks busy/error and refreshes
 * server data on success so every panel recomputes from the engine.
 *
 * `busy` is true while ANY call is in flight (counted, so overlapping saves
 * don't clear it early) and always clears — even if the network drops.
 */
export function useApi() {
  const router = useRouter();
  const [pending, setPending] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function call(url: string, init: RequestInit): Promise<boolean> {
    setError(null);
    setPending((n) => n + 1);
    try {
      const res = await fetch(url, init);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Something went wrong.");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("Couldn't reach the server — check the connection and try again.");
      return false;
    } finally {
      setPending((n) => n - 1);
    }
  }

  return { call, busy: pending > 0, error, setError };
}

export const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
