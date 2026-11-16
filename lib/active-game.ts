import type { Game, CostumeVote } from '@/db/schema';
import type { GameRankingResult } from '@/lib/scoring';
import type { SbActiveGame } from '@/lib/scoreboard';

/**
 * Shapes the live game for the public TV payload. Pure (no DB), so the rule that
 * matters is unit tested: while costume voting is open the running tally is
 * withheld *here, on the server*. Hiding it only in the UI would still leak it
 * to anyone who opens /api/scoreboard on their phone mid-vote.
 *
 * "Open" mirrors `getVotingState` / `openVotingGame`: a voting game that is not
 * complete, in an edition that is not locked.
 */
export function toSbActiveGame(
  game: Game,
  result: GameRankingResult,
  votes: Pick<CostumeVote, 'votingTeamId'>[],
  locked: boolean,
): SbActiveGame {
  const isVoting = game.scoreSource === 'voting';
  const votingOpen = isVoting && !locked && !game.isComplete;

  return {
    id: game.id,
    name: game.name,
    scoreUnit: game.scoreUnit,
    scoreType: game.scoreType,
    scoreSource: game.scoreSource,
    numRounds: game.numRounds,
    isProvisional: result.isProvisional,
    votingOpen,
    rankings: votingOpen
      ? []
      : result.rankings.map((r) => ({
          teamId: r.teamId,
          combinedScore: r.combinedScore,
          place: r.place,
          isProvisional: r.isProvisional,
        })),
    votedTeamIds: isVoting ? [...new Set(votes.map((v) => v.votingTeamId))] : [],
  };
}
