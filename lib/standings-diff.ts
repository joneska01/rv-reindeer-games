/**
 * What changed between two looks at the standings. Pure (no React, no DB) so the
 * rules are unit tested; the TV's ▲▼ markers use it now, and the "big moments"
 * (winner cards, demerit toasts) will reuse it.
 */
import type { StandingVM } from '@/lib/view-models';

export interface StandingChange {
  teamId: string;
  /** Places gained: +2 means moved up two spots, −1 means dropped one. */
  rankDelta: number;
  pointsDelta: number;
  /** New demerits since last look (positive = more fouls). */
  foulDelta: number;
}

/**
 * Compare the previous standings to the next and return only the teams that
 * moved, scored, or picked up a demerit.
 *
 * - `prev === null` (first load) reports nothing, so a TV refreshed mid-party
 *   never replays old moves.
 * - A team missing from `prev` is skipped: there is nothing to compare it to.
 * - A team that had completed no games in `prev` gets no rank movement (its points
 *   still count): the very first ranking isn't a move.
 * - Ranks are compared, not list positions, so tied teams (which share a rank)
 *   don't read as one overtaking the other.
 */
export function diffStandings(
  prev: StandingVM[] | null,
  next: StandingVM[],
): StandingChange[] {
  if (!prev) return [];
  const before = new Map(prev.map((s) => [s.teamId, s]));

  const changes: StandingChange[] = [];
  for (const s of next) {
    const old = before.get(s.teamId);
    if (!old) continue;
    const change: StandingChange = {
      teamId: s.teamId,
      // A team's first ranking isn't a move: before its first game everyone is level
      // at zero, so "dropping" from that shared 1st would be a phantom.
      rankDelta: old.gamesCompleted === 0 ? 0 : old.rank - s.rank,
      pointsDelta: s.totalPoints - old.totalPoints,
      foulDelta: s.foulCount - old.foulCount,
    };
    if (change.rankDelta !== 0 || change.pointsDelta !== 0 || change.foulDelta !== 0) {
      changes.push(change);
    }
  }
  return changes;
}
