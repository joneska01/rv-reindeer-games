import { describe, it, expect } from 'vitest';
import { detectMoments, capQueue } from '@/lib/moments';
import type { ScoreboardPayload, SbActiveGame, SbLastCompleted } from '@/lib/scoreboard';
import type { StandingVM } from '@/lib/view-models';

const standing = (teamId: string, rank: number, totalPoints: number, foulCount = 0): StandingVM => ({
  teamId, rank, totalPoints, foulCount, gamesCompleted: 1, isTied: false, unresolvedTie: false,
});

const active = (id: string, over: Partial<SbActiveGame> = {}): SbActiveGame => ({
  id, name: `Game ${id}`, scoreUnit: 'pts', scoreType: 'high_wins', scoreSource: 'manual', numRounds: 1,
  isProvisional: false, votingOpen: false, rankings: [], votedTeamIds: [], ...over,
});

const finished = (gameId: string, completedAt: string): SbLastCompleted => ({
  gameId, name: `Game ${gameId}`, scoreSource: 'manual', scoreUnit: 'pts', completedAt,
  podium: [{ teamId: 'a', combinedScore: 10, place: 1, isProvisional: false }],
});

const board = (over: Partial<ScoreboardPayload> = {}): ScoreboardPayload => ({
  active: true, year: 2026, hasStarted: true, displayMode: 'scoreboard',
  standings: [standing('a', 1, 30), standing('b', 2, 28)],
  activeGame: null, lastCompleted: null, ...over,
});

describe('detectMoments', () => {
  it('reports nothing on first load (a refreshed TV must not replay the night)', () => {
    expect(detectMoments(null, board({ activeGame: active('g1'), lastCompleted: finished('g0', '2026-12-01T20:00:00.000Z') }))).toEqual([]);
  });

  it('reports nothing when nothing changed', () => {
    const b = board({ activeGame: active('g1') });
    expect(detectMoments(b, board({ activeGame: active('g1') }))).toEqual([]);
  });

  it('announces a game that just went live', () => {
    const m = detectMoments(board(), board({ activeGame: active('g1', { scoreType: 'low_wins', scoreUnit: 'seconds' }) }));
    expect(m).toEqual([
      { kind: 'upNext', gameId: 'g1', name: 'Game g1', scoreType: 'low_wins', scoreSource: 'manual', scoreUnit: 'seconds' },
    ]);
  });

  it('announces the very first game of the night (leaving the welcome screen)', () => {
    const m = detectMoments(board({ hasStarted: false }), board({ activeGame: active('g1') }));
    expect(m.map((x) => x.kind)).toEqual(['upNext']);
  });

  it('announces a switch from one live game to another', () => {
    const m = detectMoments(board({ activeGame: active('g1') }), board({ activeGame: active('g2') }));
    expect(m.map((x) => x.kind)).toEqual(['upNext']);
  });

  it('says nothing when the live game is cleared (that is the winner card\'s job)', () => {
    expect(detectMoments(board({ activeGame: active('g1') }), board())).toEqual([]);
  });

  it('reveals the winners when a game completes', () => {
    const m = detectMoments(
      board({ activeGame: active('g1') }),
      board({ lastCompleted: finished('g1', '2026-12-01T20:30:00.000Z') }),
    );
    expect(m).toHaveLength(1);
    expect(m[0]).toMatchObject({ kind: 'winner', gameId: 'g1', name: 'Game g1' });
    expect((m[0] as { podium: unknown[] }).podium).toHaveLength(1);
  });

  it('reveals the winners of the first game ever completed', () => {
    const m = detectMoments(board(), board({ lastCompleted: finished('g1', '2026-12-01T20:30:00.000Z') }));
    expect(m.map((x) => x.kind)).toEqual(['winner']);
  });

  it('does not repeat a winner it has already shown', () => {
    const l = finished('g1', '2026-12-01T20:30:00.000Z');
    expect(detectMoments(board({ lastCompleted: l }), board({ lastCompleted: finished('g1', '2026-12-01T20:30:00.000Z') }))).toEqual([]);
  });

  it('does not celebrate an older game when a newer one is reopened', () => {
    const prev = board({ lastCompleted: finished('g2', '2026-12-01T20:40:00.000Z') });
    const next = board({ lastCompleted: finished('g1', '2026-12-01T20:30:00.000Z') });
    expect(detectMoments(prev, next)).toEqual([]);
  });

  it('flags a new demerit, with the team and how many', () => {
    const prev = board();
    const next = board({ standings: [standing('a', 1, 29, 1), standing('b', 2, 28)] });
    expect(detectMoments(prev, next)).toEqual([{ kind: 'demerit', teamId: 'a', count: 1 }]);
  });

  it('ignores a demerit being removed', () => {
    const prev = board({ standings: [standing('a', 1, 29, 1), standing('b', 2, 28)] });
    expect(detectMoments(prev, board())).toEqual([]);
  });

  it('orders a busy poll: winner, then demerit, then up next', () => {
    const prev = board({ activeGame: active('g1') });
    const next = board({
      activeGame: active('g2'),
      lastCompleted: finished('g1', '2026-12-01T20:30:00.000Z'),
      standings: [standing('a', 1, 29, 1), standing('b', 2, 28)],
    });
    expect(detectMoments(prev, next).map((x) => x.kind)).toEqual(['winner', 'demerit', 'upNext']);
  });

  it('stays quiet when a different edition becomes active', () => {
    expect(detectMoments(board({ year: 2025 }), board({ year: 2026, activeGame: active('g1') }))).toEqual([]);
  });

  it('stays quiet while the TV is on the podium or final results', () => {
    const next = board({ displayMode: 'podium', lastCompleted: finished('g1', '2026-12-01T20:30:00.000Z') });
    expect(detectMoments(board(), next)).toEqual([]);
  });

  it('stays quiet when no edition is active', () => {
    expect(detectMoments(board(), { active: false })).toEqual([]);
    expect(detectMoments({ active: false }, board({ activeGame: active('g1') }))).toEqual([]);
  });
});

describe('capQueue', () => {
  it('leaves a short queue alone', () => {
    expect(capQueue([1, 2, 3], true, 4)).toEqual([1, 2, 3]);
  });

  it('keeps the newest when nothing is playing yet (a stale backlog is not worth showing)', () => {
    expect(capQueue([1, 2, 3, 4, 5, 6], false, 4)).toEqual([3, 4, 5, 6]);
  });

  it('keeps the moment that is on screen, plus the newest, so it is never cut off mid-show', () => {
    expect(capQueue([1, 2, 3, 4, 5, 6], true, 4)).toEqual([1, 4, 5, 6]);
  });
});
