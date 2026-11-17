"use client";

import { useEffect, useState } from "react";
import { capQueue, detectMoments, MOMENT_MS, type Moment } from "@/lib/moments";
import type { ScoreboardPayload } from "@/lib/scoreboard";

export interface QueuedMoment {
  /** Unique per moment: the React key, and the seed for rotating copy. */
  id: number;
  moment: Moment;
}

/**
 * Plays the TV's "big moments" one at a time. Each new scoreboard feed is
 * compared with the last (`detectMoments`); anything that happened goes into a
 * queue, and the moment at the front holds the screen for its time, then the
 * next one starts. Returns the moment to show right now, or null.
 *
 * - The first feed is only a baseline: a refreshed TV replays nothing.
 * - Polling hands back a fresh object every time, so this finds changes by
 *   value; an unchanged poll does nothing.
 */
export function useMoments(data: ScoreboardPayload): QueuedMoment | null {
  const [seen, setSeen] = useState(data);
  const [queue, setQueue] = useState<QueuedMoment[]>([]);
  const [issued, setIssued] = useState(0);

  // Compare while rendering (React's "adjust state when a prop changes" pattern)
  // so a moment is queued in the same pass as the data that caused it.
  if (seen !== data) {
    setSeen(data);
    const found = detectMoments(seen, data);
    if (found.length > 0) {
      const fresh = found.map((moment, i) => ({ id: issued + i, moment }));
      setQueue(capQueue([...queue, ...fresh], queue.length > 0));
      setIssued(issued + found.length);
    }
  }

  const current = queue[0] ?? null;
  const currentId = current?.id;
  const kind = current?.moment.kind;

  useEffect(() => {
    if (currentId === undefined || !kind) return;
    const timer = setTimeout(
      () => setQueue((q) => q.filter((item) => item.id !== currentId)),
      MOMENT_MS[kind],
    );
    return () => clearTimeout(timer);
  }, [currentId, kind]);

  return current;
}
