import { describe, it, expect } from 'vitest';
import { diffStandings } from '@/lib/standings-diff';
import type { StandingVM } from '@/lib/view-models';

const s = (
  teamId: string,
  rank: number,
  totalPoints: number,
  foulCount = 0,
  gamesCompleted = 1,
): StandingVM => ({
  teamId, rank, totalPoints, foulCount, gamesCompleted, isTied: false, unresolvedTie: false,
});

const before = [s('a', 1, 30), s('b', 2, 28), s('c', 3, 26)];

describe('diffStandings', () => {
  it('reports nothing on first load (a TV refreshed mid-party must not replay old moves)', () => {
    expect(diffStandings(null, before)).toEqual([]);
  });

  it('reports nothing when nothing changed', () => {
    expect(diffStandings(before, [s('a', 1, 30), s('b', 2, 28), s('c', 3, 26)])).toEqual([]);
  });

  it('flags a team that overtook another as up, and the one it passed as down', () => {
    const after = [s('b', 1, 58), s('a', 2, 56), s('c', 3, 50)];
    const changes = diffStandings(before, after);
    expect(changes.find((c) => c.teamId === 'b')).toMatchObject({ rankDelta: 1, pointsDelta: 30 });
    expect(changes.find((c) => c.teamId === 'a')).toMatchObject({ rankDelta: -1, pointsDelta: 26 });
  });

  it('counts how many places were jumped', () => {
    const after = [s('c', 1, 90), s('a', 2, 60), s('b', 3, 58)];
    expect(diffStandings(before, after).find((c) => c.teamId === 'c')?.rankDelta).toBe(2);
  });

  it('reports a points change even when the rank did not move', () => {
    const after = [s('a', 1, 40), s('b', 2, 28), s('c', 3, 26)];
    expect(diffStandings(before, after)).toEqual([
      { teamId: 'a', rankDelta: 0, pointsDelta: 10, foulDelta: 0 },
    ]);
  });

  it('reports a new demerit', () => {
    const after = [s('a', 1, 29, 1), s('b', 2, 28), s('c', 3, 26)];
    expect(diffStandings(before, after)).toEqual([
      { teamId: 'a', rankDelta: 0, pointsDelta: -1, foulDelta: 1 },
    ]);
  });

  it('does not call the very first ranking a move (everyone starts level at zero)', () => {
    const level = [s('a', 1, 0, 0, 0), s('b', 1, 0, 0, 0), s('c', 1, 0, 0, 0)];
    const afterGameOne = [s('a', 1, 30), s('b', 2, 28), s('c', 3, 26)];
    const changes = diffStandings(level, afterGameOne);
    expect(changes.every((c) => c.rankDelta === 0)).toBe(true);
    // ...but the points they just earned still count.
    expect(changes.map((c) => c.pointsDelta)).toEqual([30, 28, 26]);
  });

  it('ignores a team that was not in the previous standings (nothing to compare it to)', () => {
    const after = [...before, s('d', 4, 24)];
    expect(diffStandings(before, after)).toEqual([]);
  });

  it('treats tied teams by shared rank, not list position', () => {
    const tied = [s('a', 1, 30), s('b', 1, 30), s('c', 3, 26)];
    const after = [s('a', 1, 40), s('b', 2, 30), s('c', 3, 26)];
    const changes = diffStandings(tied, after);
    expect(changes.find((c) => c.teamId === 'a')).toMatchObject({ rankDelta: 0, pointsDelta: 10 });
    expect(changes.find((c) => c.teamId === 'b')).toMatchObject({ rankDelta: -1, pointsDelta: 0 });
  });
});
