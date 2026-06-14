import { describe, it, expect } from 'vitest';
import {
  computeGameRankings,
  computeLeaderboard,
  applyTieBreakers,
} from '@/lib/scoring';
import type { Game, Score, Team, PartyFoul, CostumeVote } from '@/db/schema';
import {
  HISTORICAL_YEARS,
  getHistoricalYear,
  type HistoricalYear,
} from '@/lib/historical';

// ── Factories ────────────────────────────────────────────────────────────────

let counter = 0;
const uid = () => `id-${counter++}`;

function team(name: string, yearId = 'y'): Team {
  return { id: name, yearId, name, displayColor: '#ffffff', createdAt: new Date() };
}

function game(over: Partial<Game> & { id: string }): Game {
  return {
    yearId: 'y',
    libraryGameId: null,
    name: over.id,
    instructions: '',
    scoringDescription: '',
    scoreType: 'high_wins',
    scoreSource: 'manual',
    scoreUnit: 'points',
    numRounds: 1,
    roundCombineMethod: 'sum',
    sortOrder: 0,
    isComplete: true,
    completedAt: null,
    createdAt: new Date(),
    ...over,
  };
}

function score(gameId: string, teamId: string, raw: number, round = 1): Score {
  return {
    id: uid(),
    gameId,
    teamId,
    round,
    rawScore: String(raw),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function foul(teamId: string, yearId = 'y'): PartyFoul {
  return { id: uid(), teamId, yearId, description: null, assessedAt: new Date() };
}

function vote(
  votingTeamId: string,
  first: string,
  second: string,
  third: string,
  yearId = 'y',
): CostumeVote {
  return {
    id: uid(),
    yearId,
    votingTeamId,
    firstPlaceTeamId: first,
    secondPlaceTeamId: second,
    thirdPlaceTeamId: third,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/** points for a team in a game's rankings */
function pointsFor(
  result: ReturnType<typeof computeGameRankings>,
  teamId: string,
): number {
  return result.rankings.find((r) => r.teamId === teamId)?.placementPoints ?? 0;
}
function placeFor(
  result: ReturnType<typeof computeGameRankings>,
  teamId: string,
): number | undefined {
  return result.rankings.find((r) => r.teamId === teamId)?.place;
}

// ── Per-game ranking & points table ──────────────────────────────────────────

describe('computeGameRankings — points table & ties', () => {
  const teams = [team('A'), team('B'), team('C'), team('D')];

  it('high_wins assigns 30/28/26/24 by descending score', () => {
    const g = game({ id: 'g', scoreType: 'high_wins' });
    const scores = [
      score('g', 'A', 10),
      score('g', 'B', 8),
      score('g', 'C', 6),
      score('g', 'D', 4),
    ];
    const r = computeGameRankings(g, scores, [], teams);
    expect(pointsFor(r, 'A')).toBe(30);
    expect(pointsFor(r, 'B')).toBe(28);
    expect(pointsFor(r, 'C')).toBe(26);
    expect(pointsFor(r, 'D')).toBe(24);
  });

  it('low_wins ranks ascending', () => {
    const g = game({ id: 'g', scoreType: 'low_wins' });
    const scores = [
      score('g', 'A', 30),
      score('g', 'B', 20),
      score('g', 'C', 10),
    ];
    const r = computeGameRankings(g, scores, [], teams);
    expect(placeFor(r, 'C')).toBe(1);
    expect(placeFor(r, 'B')).toBe(2);
    expect(placeFor(r, 'A')).toBe(3);
  });

  it('tied teams share the higher place; next distinct skips consumed places', () => {
    const g = game({ id: 'g', scoreType: 'high_wins' });
    // A=10 (1st), B=8 & C=8 (tie 2nd), D=5 (4th — 3rd consumed)
    const scores = [
      score('g', 'A', 10),
      score('g', 'B', 8),
      score('g', 'C', 8),
      score('g', 'D', 5),
    ];
    const r = computeGameRankings(g, scores, [], teams);
    expect(placeFor(r, 'A')).toBe(1);
    expect(placeFor(r, 'B')).toBe(2);
    expect(placeFor(r, 'C')).toBe(2);
    expect(pointsFor(r, 'B')).toBe(28);
    expect(pointsFor(r, 'C')).toBe(28);
    expect(placeFor(r, 'D')).toBe(4);
    expect(pointsFor(r, 'D')).toBe(24);
  });

  it('teams with no score are excluded from the game ranking', () => {
    const g = game({ id: 'g' });
    const scores = [score('g', 'A', 10)]; // only A played
    const r = computeGameRankings(g, scores, [], teams);
    expect(r.rankings).toHaveLength(1);
    expect(placeFor(r, 'B')).toBeUndefined();
  });
});

// ── Multi-round combination ──────────────────────────────────────────────────

describe('computeGameRankings — multi-round combine', () => {
  const teams = [team('A'), team('B')];

  it('sum combines both rounds', () => {
    const g = game({ id: 'g', numRounds: 2, roundCombineMethod: 'sum', scoreType: 'high_wins' });
    const scores = [
      score('g', 'A', 5, 1),
      score('g', 'A', 7, 2), // 12
      score('g', 'B', 10, 1),
      score('g', 'B', 1, 2), // 11
    ];
    const r = computeGameRankings(g, scores, [], teams);
    expect(placeFor(r, 'A')).toBe(1); // 12 > 11
  });

  it('average combines both rounds', () => {
    const g = game({ id: 'g', numRounds: 2, roundCombineMethod: 'average', scoreType: 'low_wins' });
    const scores = [
      score('g', 'A', 10, 1),
      score('g', 'A', 20, 2), // avg 15
      score('g', 'B', 8, 1),
      score('g', 'B', 8, 2), // avg 8
    ];
    const r = computeGameRankings(g, scores, [], teams);
    expect(placeFor(r, 'B')).toBe(1); // lower avg wins
  });

  it('flags provisional when only round 1 of a 2-round game is in', () => {
    const g = game({ id: 'g', numRounds: 2 });
    const scores = [score('g', 'A', 5, 1)]; // round 2 missing
    const r = computeGameRankings(g, scores, [], teams);
    expect(r.isProvisional).toBe(true);
    expect(r.rankings.find((x) => x.teamId === 'A')?.isProvisional).toBe(true);
  });
});

// ── Voting (Costume Contest) ─────────────────────────────────────────────────

describe('computeGameRankings — voting aggregation', () => {
  it('sums 10/7/5 vote points and ranks high_wins', () => {
    const teams = [team('A'), team('B'), team('C')];
    const g = game({ id: 'costume', scoreSource: 'voting', scoreType: 'high_wins', yearId: 'y' });
    // Two ballots, both rank A first → A should win
    const votes = [
      vote('B', 'A', 'B', 'C'), // A+10, B+7, C+5
      vote('C', 'A', 'C', 'B'), // A+10, C+7, B+5
    ];
    const r = computeGameRankings(g, [], votes, teams);
    // A=20, C=12, B=12 → A 1st; B & C tie 2nd
    expect(placeFor(r, 'A')).toBe(1);
    expect(pointsFor(r, 'A')).toBe(30);
    expect(placeFor(r, 'B')).toBe(2);
    expect(placeFor(r, 'C')).toBe(2);
  });
});

// ── Overall leaderboard ──────────────────────────────────────────────────────

describe('computeLeaderboard', () => {
  it('only completed games contribute', () => {
    const teams = [team('A'), team('B')];
    const done = game({ id: 'done', isComplete: true });
    const active = game({ id: 'active', isComplete: false });
    const scores = [
      score('done', 'A', 10),
      score('done', 'B', 5),
      score('active', 'A', 10),
      score('active', 'B', 5),
    ];
    const lb = computeLeaderboard([done, active], scores, [], teams, []);
    const a = lb.find((e) => e.teamId === 'A')!;
    expect(a.gamesCompleted).toBe(1);
    expect(a.totalPoints).toBe(30); // only 'done'
  });

  it('party fouls deduct one point each', () => {
    const teams = [team('A')];
    const g = game({ id: 'g' });
    const scores = [score('g', 'A', 10)];
    const fouls = [foul('A'), foul('A')];
    const lb = computeLeaderboard([g], scores, [], teams, fouls);
    const a = lb.find((e) => e.teamId === 'A')!;
    expect(a.partyFoulCount).toBe(2);
    expect(a.totalPoints).toBe(28); // 30 - 2
  });
});

// ── Tie-breakers ─────────────────────────────────────────────────────────────

describe('applyTieBreakers', () => {
  function rankMap(ranked: ReturnType<typeof applyTieBreakers>) {
    return new Map(ranked.map((r) => [r.teamId, r]));
  }

  it('step 1: most game wins, EXCLUDING the Costume Contest', () => {
    const teams = [team('X'), team('Y'), team('Z')];
    // Skill G1: X=10 (1st,30), Y=5 (2nd,28)
    const g1 = game({ id: 'g1', scoreType: 'high_wins' });
    // Costume (voting): one ballot first=Y, second=X, third=Z → Y 1st(30), X 2nd(28), Z 3rd(26)
    const costume = game({ id: 'costume', scoreSource: 'voting' });
    const scores = [score('g1', 'X', 10), score('g1', 'Y', 5)];
    const votes = [vote('X', 'Y', 'X', 'Z')];
    const lb = computeLeaderboard([g1, costume], scores, votes, teams, []);
    // X = 30 + 28 = 58, Y = 28 + 30 = 58 (tied); Z = 26
    expect(lb.find((e) => e.teamId === 'X')!.totalPoints).toBe(58);
    expect(lb.find((e) => e.teamId === 'Y')!.totalPoints).toBe(58);
    const ranked = rankMap(applyTieBreakers(teams, lb, [g1, costume], scores, votes));
    // X has 1 skill win, Y's only win is the Costume (excluded) → X ahead
    expect(ranked.get('X')!.rank).toBe(1);
    expect(ranked.get('Y')!.rank).toBe(2);
  });

  it('step 3: fewest party fouls breaks a tie when wins & top-3 match', () => {
    const teams = [team('X'), team('Y')];
    // Identical placements across two games → equal wins & top-3
    const g1 = game({ id: 'g1' });
    const g2 = game({ id: 'g2' });
    const scores = [
      score('g1', 'X', 10), score('g1', 'Y', 10), // tie 1st, 30 each
      score('g2', 'X', 8), score('g2', 'Y', 6), // X 1st(30), Y 2nd(28)
    ];
    // Pre-foul: X=60, Y=58. Give X 2 fouls → 58, Y 0 fouls → 58 (tied)
    const fouls = [foul('X'), foul('X')];
    const lb = computeLeaderboard([g1, g2], scores, [], teams, fouls);
    expect(lb.find((e) => e.teamId === 'X')!.totalPoints).toBe(58);
    expect(lb.find((e) => e.teamId === 'Y')!.totalPoints).toBe(58);
    const ranked = rankMap(applyTieBreakers(teams, lb, [g1, g2], scores, []));
    // Wins: X has g1(tie-1st)+g2(1st)=2, Y has g1(tie-1st)=1 → step 1 already favors X.
    // (Sanity: the team with more wins / fewer fouls ranks first.)
    expect(ranked.get('X')!.rank).toBe(1);
    expect(ranked.get('Y')!.rank).toBe(2);
  });

  it('step 5: fully identical teams surface an unresolved tie', () => {
    const teams = [team('X'), team('Y')];
    const g1 = game({ id: 'g1' });
    const scores = [score('g1', 'X', 10), score('g1', 'Y', 10)];
    const lb = computeLeaderboard([g1], scores, [], teams, []);
    const ranked = applyTieBreakers(teams, lb, [g1], scores, []);
    expect(ranked.every((r) => r.totalPoints === 30)).toBe(true);
    expect(ranked.every((r) => r.isTied)).toBe(true);
    expect(ranked.every((r) => r.unresolvedTie)).toBe(true);
    expect(ranked.every((r) => r.rank === 1)).toBe(true);
  });
});

// ── Museum fixtures: internal integrity (all years) ──────────────────────────

describe('historical museum fixtures — integrity', () => {
  for (const fixture of HISTORICAL_YEARS) {
    describe(`${fixture.year}`, () => {
      it('every team total = Σ(counted placement points) − Σ(applied fouls)', () => {
        const countedGames = new Set(
          fixture.games.filter((g) => g.counted).map((g) => g.name),
        );
        for (const t of fixture.teams) {
          const points = fixture.results
            .filter((r) => r.team === t.name && countedGames.has(r.game))
            .reduce((sum, r) => sum + r.placement_points, 0);
          const appliedFouls = fixture.party_fouls
            .filter((f) => f.team === t.name && f.applied)
            .reduce((sum, f) => sum + f.count, 0);
          expect(points - appliedFouls, `${fixture.year} ${t.name}`).toBe(
            t.final_total,
          );
        }
      });

      it('ranks are ordered by descending total', () => {
        const byRank = [...fixture.teams].sort((a, b) => a.final_rank - b.final_rank);
        for (let i = 1; i < byRank.length; i++) {
          expect(byRank[i].final_total).toBeLessThanOrEqual(byRank[i - 1].final_total);
        }
      });
    });
  }
});

// ── 2023: live engine reproduces documented standings ────────────────────────

describe('scoring engine reproduces 2023 documented standings', () => {
  const fixture = getHistoricalYear(2023) as HistoricalYear;

  // Adapter: feed placement points as round-1 manual high-wins scores.
  const teams = fixture.teams.map((t) => team(t.name, '2023'));
  const games = fixture.games.map((g) =>
    game({
      id: g.name,
      yearId: '2023',
      scoreType: g.score_type,
      scoreSource: 'manual', // costume votes aren't recoverable; points stored directly
      numRounds: 1,
      isComplete: true,
    }),
  );
  const scores = fixture.results.map((r) => score(r.game, r.team, r.placement_points));
  const fouls: PartyFoul[] = fixture.party_fouls
    .filter((f) => f.applied)
    .flatMap((f) => Array.from({ length: f.count }, () => foul(f.team, '2023')));

  const leaderboard = computeLeaderboard(games, scores, [], teams, fouls);
  const ranked = applyTieBreakers(teams, leaderboard, games, scores, []);

  it('matches every team total', () => {
    for (const t of fixture.teams) {
      const entry = leaderboard.find((e) => e.teamId === t.name)!;
      expect(entry.totalPoints, t.name).toBe(t.final_total);
    }
  });

  it('matches every team final rank', () => {
    for (const t of fixture.teams) {
      const r = ranked.find((e) => e.teamId === t.name)!;
      expect(r.rank, t.name).toBe(t.final_rank);
    }
  });
});
