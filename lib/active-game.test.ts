import { describe, it, expect } from 'vitest';
import { toSbActiveGame } from '@/lib/active-game';
import type { Game, CostumeVote } from '@/db/schema';
import type { GameRankingResult } from '@/lib/scoring';

const game = (over: Partial<Game> = {}) =>
  ({
    id: 'g1', yearId: 'y', name: 'Costume Contest', scoreType: 'high_wins', scoreSource: 'voting',
    scoreUnit: 'pts', numRounds: 1, isComplete: false, ...over,
  }) as Game;

const vote = (votingTeamId: string) => ({ votingTeamId }) as CostumeVote;

const result: GameRankingResult = {
  gameId: 'g1',
  isProvisional: false,
  rankings: [
    { teamId: 'a', combinedScore: 17, place: 1, placementPoints: 30, isProvisional: false },
    { teamId: 'b', combinedScore: 10, place: 2, placementPoints: 28, isProvisional: false },
  ],
};

describe('toSbActiveGame', () => {
  it('withholds the tally while costume voting is open (so the TV cannot spoil it)', () => {
    const sb = toSbActiveGame(game(), result, [vote('a')], false);
    expect(sb.votingOpen).toBe(true);
    expect(sb.rankings).toEqual([]);
  });

  it('still reports who has voted while the tally is withheld', () => {
    const sb = toSbActiveGame(game(), result, [vote('a'), vote('b'), vote('a')], false);
    expect(sb.votedTeamIds.sort()).toEqual(['a', 'b']);
  });

  it('passes rankings straight through for a manually scored game', () => {
    const sb = toSbActiveGame(game({ scoreSource: 'manual' }), result, [], false);
    expect(sb.votingOpen).toBe(false);
    expect(sb.rankings).toHaveLength(2);
    expect(sb.rankings[0]).toEqual({ teamId: 'a', combinedScore: 17, place: 1, isProvisional: false });
    expect(sb.votedTeamIds).toEqual([]);
  });

  it('shows the tally once the edition is locked (the booth is closed)', () => {
    const sb = toSbActiveGame(game(), result, [vote('a')], true);
    expect(sb.votingOpen).toBe(false);
    expect(sb.rankings).toHaveLength(2);
  });

  it('shows the tally for a voting game that is already complete', () => {
    const sb = toSbActiveGame(game({ isComplete: true }), result, [vote('a')], false);
    expect(sb.votingOpen).toBe(false);
    expect(sb.rankings).toHaveLength(2);
  });
});
