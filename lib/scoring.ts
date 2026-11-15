/**
 * Pure scoring engine — zero database calls.
 * All API routes and components import from here.
 * Unit-tested against 2023/2024/2025 historical data (Phase 2).
 */
import type { Game, Score, CostumeVote, Team, PartyFoul } from '@/db/schema';

// ── Points table ────────────────────────────────────────────────────────────

const PLACEMENT_POINTS: Record<number, number> = {
  1: 30, 2: 28, 3: 26, 4: 24, 5: 22, 6: 20, 7: 18, 8: 16,
  9: 14, 10: 12, 11: 10, 12: 8, 13: 6, 14: 4, 15: 2,
};

function placementPoints(place: number): number {
  return PLACEMENT_POINTS[place] ?? 1;
}

// ── Types ───────────────────────────────────────────────────────────────────

export interface GameRankingEntry {
  teamId: string;
  combinedScore: number;
  place: number;
  placementPoints: number;
  isProvisional: boolean; // round 1 of 2-round game
}

export interface GameRankingResult {
  gameId: string;
  rankings: GameRankingEntry[];
  isProvisional: boolean;
}

export interface LeaderboardEntry {
  teamId: string;
  totalPoints: number;
  partyFoulCount: number;
  gamesCompleted: number;
  gamePoints: Record<string, number>; // gameId → placement points
  gameRawScores: Record<string, number>; // gameId → combined raw score
}

export type LeaderboardResult = LeaderboardEntry[];

export interface RankedTeam {
  teamId: string;
  rank: number;
  totalPoints: number;
  partyFoulCount: number;
  gamesCompleted: number;
  isTied: boolean;
  unresolvedTie: boolean; // step-5 tie that requires manual resolution
}

// ── Vote aggregation ─────────────────────────────────────────────────────────

function aggregateVotePoints(
  votes: CostumeVote[],
  yearId: string,
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const v of votes) {
    if (v.yearId !== yearId) continue;
    totals.set(v.firstPlaceTeamId, (totals.get(v.firstPlaceTeamId) ?? 0) + 10);
    totals.set(v.secondPlaceTeamId, (totals.get(v.secondPlaceTeamId) ?? 0) + 7);
    totals.set(v.thirdPlaceTeamId, (totals.get(v.thirdPlaceTeamId) ?? 0) + 5);
  }
  return totals;
}

// ── Per-game combined score ───────────────────────────────────────────────────

function combinedScore(game: Game, scores: Score[], teamId: string): number | null {
  const teamScores = scores.filter(
    (s) => s.gameId === game.id && s.teamId === teamId,
  );
  if (teamScores.length === 0) return null;

  if (game.numRounds === 1) {
    const s = teamScores.find((s) => s.round === 1);
    return s ? Number(s.rawScore) : null;
  }

  const r1 = teamScores.find((s) => s.round === 1);
  const r2 = teamScores.find((s) => s.round === 2);
  if (!r1) return null;
  if (!r2) return Number(r1.rawScore); // provisional

  const sum = Number(r1.rawScore) + Number(r2.rawScore);
  return game.roundCombineMethod === 'average' ? sum / 2 : sum;
}

function isProvisionalEntry(game: Game, scores: Score[], teamId: string): boolean {
  if (game.numRounds < 2) return false;
  const r1 = scores.find((s) => s.gameId === game.id && s.teamId === teamId && s.round === 1);
  const r2 = scores.find((s) => s.gameId === game.id && s.teamId === teamId && s.round === 2);
  return !!r1 && !r2;
}

// ── Rank from sorted scores ───────────────────────────────────────────────────

interface ScoredTeam {
  teamId: string;
  score: number;
}

function assignPlacements(sorted: ScoredTeam[]): GameRankingEntry[] {
  // sorted must already be in win order (high score first for high_wins, etc.)
  const results: GameRankingEntry[] = [];
  let place = 1;
  let i = 0;
  while (i < sorted.length) {
    const currentScore = sorted[i].score;
    const tiedGroup: ScoredTeam[] = [];
    while (i < sorted.length && sorted[i].score === currentScore) {
      tiedGroup.push(sorted[i]);
      i++;
    }
    // All tied teams get the same (higher) place
    for (const t of tiedGroup) {
      results.push({
        teamId: t.teamId,
        combinedScore: t.score,
        place,
        placementPoints: placementPoints(place),
        isProvisional: false,
      });
    }
    // Next distinct place skips consumed slots
    place += tiedGroup.length;
  }
  return results;
}

// ── Core exports ─────────────────────────────────────────────────────────────

export function computeGameRankings(
  game: Game,
  scores: Score[],
  votes: CostumeVote[],
  teams: Team[],
): GameRankingResult {
  const scoredTeams: ScoredTeam[] = [];
  let anyProvisional = false;

  if (game.scoreSource === 'voting') {
    const votePts = aggregateVotePoints(votes, game.yearId);
    for (const team of teams) {
      const pts = votePts.get(team.id) ?? 0;
      if (pts > 0) {
        scoredTeams.push({ teamId: team.id, score: pts });
      }
    }
  } else {
    for (const team of teams) {
      const score = combinedScore(game, scores, team.id);
      if (score !== null) {
        scoredTeams.push({ teamId: team.id, score });
        if (isProvisionalEntry(game, scores, team.id)) {
          anyProvisional = true;
        }
      }
    }
  }

  // Sort: high_wins → descending; low_wins → ascending
  scoredTeams.sort((a, b) =>
    game.scoreType === 'low_wins' ? a.score - b.score : b.score - a.score,
  );

  const rankings = assignPlacements(scoredTeams);

  // Mark provisional entries
  if (anyProvisional) {
    for (const r of rankings) {
      r.isProvisional = isProvisionalEntry(game, scores, r.teamId);
    }
  }

  return { gameId: game.id, rankings, isProvisional: anyProvisional };
}

export function computeLeaderboard(
  games: Game[],
  scores: Score[],
  votes: CostumeVote[],
  teams: Team[],
  partyFouls: PartyFoul[],
): LeaderboardResult {
  const completedGames = games.filter((g) => g.isComplete);

  return teams.map((team) => {
    let totalPoints = 0;
    const gamePoints: Record<string, number> = {};
    const gameRawScores: Record<string, number> = {};
    let gamesCompleted = 0;

    for (const game of completedGames) {
      const { rankings } = computeGameRankings(game, scores, votes, teams);
      const entry = rankings.find((r) => r.teamId === team.id);
      if (entry) {
        gamePoints[game.id] = entry.placementPoints;
        gameRawScores[game.id] = entry.combinedScore;
        totalPoints += entry.placementPoints;
        gamesCompleted++;
      }
    }

    const partyFoulCount = partyFouls.filter(
      (f) => f.teamId === team.id && f.yearId === team.yearId,
    ).length;
    totalPoints -= partyFoulCount;

    return {
      teamId: team.id,
      totalPoints,
      partyFoulCount,
      gamesCompleted,
      gamePoints,
      gameRawScores,
    };
  });
}

/** The game finished most recently. Falls back to list order when no
 *  completion times are recorded (the PRD says "last game marked complete"). */
function lastCompletedGame(completed: Game[]): Game | undefined {
  let last: Game | undefined;
  for (const g of completed) {
    if (!last) last = g;
    else if (g.completedAt && last.completedAt) {
      if (g.completedAt >= last.completedAt) last = g;
    } else if (!last.completedAt || !g.completedAt) {
      last = g; // can't compare — later in the list wins
    }
  }
  return last;
}

export function applyTieBreakers(
  teams: Team[],
  leaderboard: LeaderboardResult,
  games: Game[],
  scores: Score[],
  votes: CostumeVote[],
): RankedTeam[] {
  const completedGames = games.filter((g) => g.isComplete);
  const skillGames = completedGames.filter((g) => g.scoreSource !== 'voting');

  // gameId → teamId → place, for every completed game.
  const places = new Map<string, Map<string, number>>();
  for (const game of completedGames) {
    const { rankings } = computeGameRankings(game, scores, votes, teams);
    places.set(game.id, new Map(rankings.map((r) => [r.teamId, r.place])));
  }
  const placeIn = (g: Game, teamId: string) => places.get(g.id)?.get(teamId);
  const byTeam = new Map(leaderboard.map((e) => [e.teamId, e]));
  const lastGame = lastCompletedGame(completedGames);

  // Tie-break steps, in PRD order. Each maps a team to a number where
  // HIGHER is better; a step that separates only some teams still counts.
  const steps: Array<(teamId: string) => number> = [
    // 1. Most game wins (Costume Contest excluded — non-skill game)
    (id) => skillGames.filter((g) => placeIn(g, id) === 1).length,
    // 2. Most top-3 finishes (Costume Contest included)
    (id) => completedGames.filter((g) => (placeIn(g, id) ?? Infinity) <= 3).length,
    // 3. Fewest party fouls
    (id) => -(byTeam.get(id)?.partyFoulCount ?? 0),
    // 4. Better placement in the last completed game
    (id) => (lastGame ? -(placeIn(lastGame, id) ?? 999) : 0),
  ];

  const sorted = [...leaderboard].sort((a, b) => b.totalPoints - a.totalPoints);
  const result: RankedTeam[] = [];
  let place = 1;
  let i = 0;

  while (i < sorted.length) {
    const points = sorted[i].totalPoints;
    const group: string[] = [];
    while (i < sorted.length && sorted[i].totalPoints === points) {
      group.push(sorted[i].teamId);
      i++;
    }

    // Best-first sub-groups. Teams still level after step 4 are step-5 ties
    // that need the host to settle them by hand.
    let subPlace = place;
    for (const sub of resolveTies(group, steps)) {
      for (const teamId of sub) {
        const entry = byTeam.get(teamId)!;
        result.push({
          teamId,
          rank: subPlace,
          totalPoints: points,
          partyFoulCount: entry.partyFoulCount,
          gamesCompleted: entry.gamesCompleted,
          isTied: sub.length > 1,
          unresolvedTie: sub.length > 1,
        });
      }
      subPlace += sub.length;
    }
    place += group.length;
  }

  return result;
}

/** Split tied teams into best-first sub-groups, recursing into each
 *  still-level sub-group with the remaining steps. */
function resolveTies(ids: string[], steps: Array<(teamId: string) => number>): string[][] {
  if (ids.length <= 1 || steps.length === 0) return [ids];
  const [step, ...rest] = steps;
  const buckets = new Map<number, string[]>();
  for (const id of ids) {
    const v = step(id);
    buckets.set(v, [...(buckets.get(v) ?? []), id]);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => b - a)
    .flatMap(([, members]) => resolveTies(members, rest));
}
