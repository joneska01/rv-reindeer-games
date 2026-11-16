"use client";

import { useEffect, useState } from "react";
import { diffStandings, type StandingChange } from "@/lib/standings-diff";
import type { StandingVM } from "@/lib/view-models";

/**
 * Remembers who just moved, scored, or took a demerit, so the TV can show ▲▼
 * markers for a while after a poll brings in new standings.
 *
 * - Only changes seen *after* mount are reported: the first look is the baseline,
 *   so a TV refreshed mid-party shows no phantom movement.
 * - Markers clear `holdMs` after the most recent change.
 * - Polling hands back a fresh array every time, so changes are found by value
 *   (`diffStandings`), not identity; an unchanged poll leaves everything alone.
 */
export function useStandingChanges(
  standings: StandingVM[],
  holdMs = 20_000,
): Map<string, StandingChange> {
  const [seen, setSeen] = useState(standings);
  const [changes, setChanges] = useState<Map<string, StandingChange>>(() => new Map());

  // React's sanctioned "adjust state when a prop changes" pattern: compare during
  // render instead of in an effect, so there is no extra paint with stale markers.
  if (seen !== standings) {
    setSeen(standings);
    const found = diffStandings(seen, standings);
    if (found.length > 0) {
      setChanges(new Map([...changes, ...found.map((c) => [c.teamId, c] as const)]));
    }
  }

  useEffect(() => {
    if (changes.size === 0) return;
    const id = setTimeout(() => setChanges(new Map()), holdMs);
    return () => clearTimeout(id);
  }, [changes, holdMs]);

  return changes;
}
