/**
 * "Big moments" for the TV: the beats people cheer at. A new game going live, a
 * game finishing (and who won), a demerit landing. Found by comparing two
 * consecutive scoreboard feeds, so it is pure and unit tested; the screen just
 * plays whatever this returns.
 */
import { diffStandings } from '@/lib/standings-diff';
import type { ScoreboardPayload, SbGameRank } from '@/lib/scoreboard';

export type Moment =
  | {
      kind: 'upNext';
      gameId: string;
      name: string;
      scoreType: 'high_wins' | 'low_wins';
      scoreSource: 'manual' | 'voting';
      scoreUnit: string;
    }
  | {
      kind: 'winner';
      gameId: string;
      name: string;
      scoreSource: 'manual' | 'voting';
      scoreUnit: string;
      podium: SbGameRank[];
    }
  | { kind: 'demerit'; teamId: string; count: number };

/** How long each moment holds the screen. */
export const MOMENT_MS: Record<Moment['kind'], number> = {
  upNext: 4000,
  winner: 8000,
  demerit: 4500,
};

/**
 * If the laptop sleeps or the tab sits hidden, the next look can be many changes
 * ahead. Keep only the most recent few rather than replaying the whole backlog.
 */
export const MAX_QUEUE = 4;

/**
 * Trim a moment queue to `max`. While one is on screen (`playing`) it stays so it
 * isn't cut off mid-show; otherwise only the newest survive, since a stale backlog
 * isn't worth replaying.
 */
export function capQueue<T>(queue: T[], playing: boolean, max = MAX_QUEUE): T[] {
  if (queue.length <= max) return queue;
  return playing ? [queue[0], ...queue.slice(-(max - 1))] : queue.slice(-max);
}

/**
 * Which moments happened between `prev` and `next`, in the order to play them
 * (winner, demerits, then up next).
 *
 * Quiet by design: nothing on first load (a refreshed TV must not replay the
 * night), nothing across editions, and nothing while the TV is on the podium or
 * final results.
 */
export function detectMoments(
  prev: ScoreboardPayload | null,
  next: ScoreboardPayload,
): Moment[] {
  if (!prev || !prev.active || !next.active) return [];
  if (prev.year !== next.year) return [];
  if ((next.displayMode ?? 'scoreboard') !== 'scoreboard') return [];

  const moments: Moment[] = [];

  // A game finished. Compared by completion time, so reopening a game (which makes
  // an *older* game the latest again) is not celebrated as a new win.
  const done = next.lastCompleted;
  if (
    done &&
    (!prev.lastCompleted ||
      Date.parse(done.completedAt) > Date.parse(prev.lastCompleted.completedAt))
  ) {
    moments.push({
      kind: 'winner',
      gameId: done.gameId,
      name: done.name,
      scoreSource: done.scoreSource,
      scoreUnit: done.scoreUnit,
      podium: done.podium,
    });
  }

  for (const c of diffStandings(prev.standings ?? null, next.standings ?? [])) {
    if (c.foulDelta > 0) moments.push({ kind: 'demerit', teamId: c.teamId, count: c.foulDelta });
  }

  const live = next.activeGame;
  if (live && live.id !== prev.activeGame?.id) {
    moments.push({
      kind: 'upNext',
      gameId: live.id,
      name: live.name,
      scoreType: live.scoreType,
      scoreSource: live.scoreSource,
      scoreUnit: live.scoreUnit,
    });
  }

  return moments;
}
