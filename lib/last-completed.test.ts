import { describe, it, expect } from 'vitest';
import { pickLastCompleted, toSbLastCompleted } from '@/lib/last-completed';
import type { Game } from '@/db/schema';
import type { GameRankingResult } from '@/lib/scoring';

const game = (over: Partial<Game>) =>
  ({
    id: 'g', name: 'Game', scoreSource: 'manual', scoreUnit: 'pts', isComplete: false, completedAt: null, ...over,
  }) as Game;

const at = (iso: string) => new Date(iso);

describe('pickLastCompleted', () => {
  it('returns null when nothing is complete', () => {
    expect(pickLastCompleted([game({ id: 'a' }), game({ id: 'b' })])).toBeNull();
  });

  it('picks the game completed most recently, not the one that sorts last', () => {
    const games = [
      game({ id: 'a', isComplete: true, completedAt: at('2026-12-01T20:30:00Z') }),
      game({ id: 'b', isComplete: true, completedAt: at('2026-12-01T20:10:00Z') }),
    ];
    expect(pickLastCompleted(games)?.id).toBe('a');
  });

  it('ignores a game that is marked complete but has no completion time', () => {
    const games = [
      game({ id: 'a', isComplete: true, completedAt: null }),
      game({ id: 'b', isComplete: true, completedAt: at('2026-12-01T20:10:00Z') }),
    ];
    expect(pickLastCompleted(games)?.id).toBe('b');
  });

  it('ignores a reopened game even if it still has an old completion time', () => {
    const games = [
      game({ id: 'a', isComplete: false, completedAt: at('2026-12-01T21:00:00Z') }),
      game({ id: 'b', isComplete: true, completedAt: at('2026-12-01T20:10:00Z') }),
    ];
    expect(pickLastCompleted(games)?.id).toBe('b');
  });
});

const entry = (teamId: string, place: number, combinedScore: number) => ({
  teamId, combinedScore, place, placementPoints: 0, isProvisional: false,
});

describe('toSbLastCompleted', () => {
  const g = game({ id: 'cc', name: 'Costume Contest', scoreSource: 'voting', scoreUnit: 'vote points', isComplete: true, completedAt: at('2026-12-01T20:30:00Z') });

  it('carries the game identity and an ISO completion time', () => {
    const r: GameRankingResult = { gameId: 'cc', isProvisional: false, rankings: [entry('a', 1, 17)] };
    expect(toSbLastCompleted(g, r)).toMatchObject({
      gameId: 'cc', name: 'Costume Contest', scoreSource: 'voting', scoreUnit: 'vote points',
      completedAt: '2026-12-01T20:30:00.000Z',
    });
  });

  it('keeps only the top three places, in order', () => {
    const r: GameRankingResult = {
      gameId: 'cc', isProvisional: false,
      rankings: [entry('a', 1, 17), entry('b', 2, 12), entry('c', 3, 9), entry('d', 4, 4), entry('e', 5, 1)],
    };
    expect(toSbLastCompleted(g, r).podium.map((p) => p.teamId)).toEqual(['a', 'b', 'c']);
  });

  it('keeps every team tied for a podium place', () => {
    const r: GameRankingResult = {
      gameId: 'cc', isProvisional: false,
      rankings: [entry('a', 1, 17), entry('b', 2, 12), entry('c', 2, 12), entry('d', 4, 4)],
    };
    expect(toSbLastCompleted(g, r).podium.map((p) => [p.teamId, p.place])).toEqual([['a', 1], ['b', 2], ['c', 2]]);
  });

  it('exposes only the fields the TV needs (no placement points)', () => {
    const r: GameRankingResult = { gameId: 'cc', isProvisional: false, rankings: [entry('a', 1, 17)] };
    expect(toSbLastCompleted(g, r).podium[0]).toEqual({ teamId: 'a', combinedScore: 17, place: 1, isProvisional: false });
  });
});
