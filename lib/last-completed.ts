import type { Game } from '@/db/schema';
import type { GameRankingResult } from '@/lib/scoring';
import type { SbLastCompleted } from '@/lib/scoreboard';

/**
 * The game finished most recently. "Most recently" is by completion time, not
 * sort order, so reordering the schedule can't change who the TV celebrates.
 * A game with no completion time (or one that was reopened) never counts.
 * Pure, so it's unit tested.
 */
export function pickLastCompleted(games: Game[]): Game | null {
  let latest: Game | null = null;
  for (const g of games) {
    if (!g.isComplete || !g.completedAt) continue;
    if (!latest || g.completedAt > latest.completedAt!) latest = g;
  }
  return latest;
}

/**
 * Shapes a finished game for the TV: who it was and who made the podium (top
 * three places, keeping every team tied for one). This is what the winner card
 * reveals, and for the costume contest it is the first time the tally is shown.
 */
export function toSbLastCompleted(game: Game, result: GameRankingResult): SbLastCompleted {
  return {
    gameId: game.id,
    name: game.name,
    scoreSource: game.scoreSource,
    scoreUnit: game.scoreUnit,
    completedAt: game.completedAt!.toISOString(),
    podium: result.rankings
      .filter((r) => r.place <= 3)
      .map((r) => ({
        teamId: r.teamId,
        combinedScore: r.combinedScore,
        place: r.place,
        isProvisional: r.isProvisional,
      })),
  };
}
