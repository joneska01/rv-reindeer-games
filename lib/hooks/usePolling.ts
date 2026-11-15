"use client";

import { useEffect, useState } from "react";

/**
 * Poll a JSON endpoint every `ms` and return the latest good payload.
 *
 * - Keeps the last good data when a request fails or returns a non-2xx, so a
 *   network blip never blanks the TV or a guest's phone.
 * - Never stacks requests: a tick is skipped while the previous one is in flight.
 * - Pauses while the tab is hidden (a pocketed phone stops hitting the server)
 *   and fetches once, right away, when the tab becomes visible again.
 *
 * `tick` counts successful polls — handy as a "something new arrived" seed.
 */
export function usePolling<T>(url: string, ms: number, initial: T): { data: T; tick: number } {
  const [data, setData] = useState<T>(initial);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    let inFlight = false;

    async function poll() {
      if (inFlight || document.visibilityState !== "visible") return;
      inFlight = true;
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return;
        const next = (await res.json()) as T;
        if (alive) {
          setData(next);
          setTick((t) => t + 1);
        }
      } catch {
        /* keep showing the last good data */
      } finally {
        inFlight = false;
      }
    }

    const id = setInterval(poll, ms);
    document.addEventListener("visibilitychange", poll);
    return () => {
      alive = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [url, ms]);

  return { data, tick };
}
