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
  let scoredTeams: ScoredTeam[] = [];
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
  const totalGames = games.length;

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

export function applyTieBreakers(
  teams: Team[],
  leaderboard: LeaderboardResult,
  games: Game[],
  scores: Score[],
  votes: CostumeVote[],
): RankedTeam[] {
  const completedGames = games.filter((g) => g.isComplete);
  const costumeContestGame = completedGames.find(
    (g) => g.scoreSource === 'voting',
  );
  const skillGames = completedGames.filter((g) => g.scoreSource !== 'voting');

  // Build per-team game ranking data for tie-breaking
  const gameRankingsMap = new Map<string, Map<string, number>>(); // gameId → teamId → place
  for (const game of completedGames) {
    const { rankings } = computeGameRankings(game, scores, votes, teams);
    const placeMap = new Map<string, number>();
    for (const r of rankings) {
      placeMap.set(r.teamId, r.place);
    }
    gameRankingsMap.set(game.id, placeMap);
  }

  // Sort leaderboard descending by total points, then apply tie-breakers
  const sorted = [...leaderboard].sort((a, b) => b.totalPoints - a.totalPoints);

  const result: RankedTeam[] = [];
  let place = 1;
  let i = 0;

  while (i < sorted.length) {
    const currentPoints = sorted[i].totalPoints;
    // Collect all teams with this point total
    const group: LeaderboardEntry[] = [];
    while (i < sorted.length && sorted[i].totalPoints === currentPoints) {
      group.push(sorted[i]);
      i++;
    }

    if (group.length === 1) {
      const entry = group[0];
      result.push({
        teamId: entry.teamId,
        rank: place,
        totalPoints: entry.totalPoints,
        partyFoulCount: entry.partyFoulCount,
        gamesCompleted: entry.gamesCompleted,
        isTied: false,
        unresolvedTie: false,
      });
      place++;
      continue;
    }

    // Tie-break within group
    const broken = breakTie(group, teams, skillGames, completedGames, costumeContestGame, gameRankingsMap);

    let subPlace = place;
    let subI = 0;
    while (subI < broken.length) {
      const subScore = broken[subI].tieBreakScore;
      const subGroup: typeof broken = [];
      while (subI < broken.length && broken[subI].tieBreakScore === subScore) {
        subGroup.push(broken[subI]);
        subI++;
      }
      const isUnresolved = broken[0].step === 5 && subGroup.length > 1;
      for (const t of subGroup) {
        result.push({
          teamId: t.teamId,
          rank: subPlace,
          totalPoints: currentPoints,
          partyFoulCount: leaderboard.find((e) => e.teamId === t.teamId)!.partyFoulCount,
          gamesCompleted: leaderboard.find((e) => e.teamId === t.teamId)!.gamesCompleted,
          isTied: subGroup.length > 1,
          unresolvedTie: isUnresolved,
        });
      }
      subPlace += subGroup.length;
    }
    place += group.length;
  }

  return result;
}

// ── Internal tie-breaker logic ────────────────────────────────────────────────

interface TieBreakEntry {
  teamId: string;
  tieBreakScore: number;
  step: number;
}

function breakTie(
  group: LeaderboardEntry[],
  teams: Team[],
  skillGames: Game[],
  allCompletedGames: Game[],
  costumeContestGame: Game | undefined,
  gameRankingsMap: Map<string, Map<string, number>>,
): TieBreakEntry[] {
  // Step 1: Most game wins (1st place finishes), Costume Contest excluded
  const step1 = group.map((e) => {
    const wins = skillGames.filter((g) => {
      const placeMap = gameRankingsMap.get(g.id);
      return placeMap?.get(e.teamId) === 1;
    }).length;
    return { teamId: e.teamId, tieBreakScore: wins, step: 1 };
  });
  if (areDistinct(step1)) return sortDesc(step1);

  // Step 2: Most top-3 finishes (all games including Costume Contest)
  const step2 = group.map((e) => {
    const top3 = allCompletedGames.filter((g) => {
      const placeMap = gameRankingsMap.get(g.id);
      const p = placeMap?.get(e.teamId);
      return p !== undefined && p <= 3;
    }).length;
    return { teamId: e.teamId, tieBreakScore: top3, step: 2 };
  });
  if (areDistinct(step2)) return sortDesc(step2);

  // Step 3: Fewest party fouls (negate so higher = better)
  const step3 = group.map((e) => ({
    teamId: e.teamId,
    tieBreakScore: -e.partyFoulCount,
    step: 3,
  }));
  if (areDistinct(step3)) return sortDesc(step3);

  // Step 4: Higher placement in the last completed game
  const lastGame = allCompletedGames[allCompletedGames.length - 1];
  if (lastGame) {
    const lastPlaceMap = gameRankingsMap.get(lastGame.id);
    const step4 = group.map((e) => {
      const place = lastPlaceMap?.get(e.teamId) ?? 999;
      return { teamId: e.teamId, tieBreakScore: -place, step: 4 }; // negate: lower place = higher score
    });
    if (areDistinct(step4)) return sortDesc(step4);
  }

  // Step 5: Unresolved — manual admin resolution required
  return group.map((e) => ({ teamId: e.teamId, tieBreakScore: 0, step: 5 }));
}

function areDistinct(entries: TieBreakEntry[]): boolean {
  const scores = entries.map((e) => e.tieBreakScore);
  return new Set(scores).size === scores.length;
}

function sortDesc(entries: TieBreakEntry[]): TieBreakEntry[] {
  return [...entries].sort((a, b) => b.tieBreakScore - a.tieBreakScore);
}
