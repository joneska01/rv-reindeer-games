import 'server-only';
import { getActiveYear } from '@/lib/years';
import { getLiveData, rankStandings } from '@/lib/live';
import { computeGameRankings } from '@/lib/scoring';
import { toTeamVM, toStandingVM, type TeamVM, type StandingVM } from '@/lib/view-models';

// ── Public payload types (safe to `import type` from client components) ──────

export interface SbGameRank {
  teamId: string;
  combinedScore: number;
  place: number;
  isProvisional: boolean;
}

export interface SbActiveGame {
  id: string;
  name: string;
  scoreUnit: string;
  scoreType: 'high_wins' | 'low_wins';
  scoreSource: 'manual' | 'voting';
  numRounds: number;
  isProvisional: boolean;
  rankings: SbGameRank[];
  /** For voting games: team ids that have cast a ballot. */
  votedTeamIds: string[];
}

export interface ScoreboardPayload {
  active: boolean;
  year?: number;
  isTest?: boolean;
  locked?: boolean;
  hasStarted?: boolean;
  displayMode?: 'scoreboard' | 'podium' | 'final_results';
  podiumState?: 'hidden' | 'show_third' | 'show_second' | 'show_first' | 'show_all';
  teams?: TeamVM[];
  standings?: StandingVM[];
  activeGame?: SbActiveGame | null;
  totalGames?: number;
  completedGames?: number;
}

/**
 * Single source for the public TV display. Reads the active edition, runs the
 * scoring engine, and shapes a plain JSON payload for `/scoreboard` and the
 * polling API. Returns `{ active: false }` when no edition is running.
 */
export async function buildScoreboard(): Promise<ScoreboardPayload> {
  const year = await getActiveYear();
  if (!year) return { active: false };

  const data = await getLiveData(year.id);
  const { ranked } = rankStandings(data);

  const teams = data.teams.map(toTeamVM);
  const standings = ranked.map(toStandingVM);

  let activeGame: SbActiveGame | null = null;
  const live = year.activeGameId
    ? data.games.find((g) => g.id === year.activeGameId)
    : undefined;
  if (live) {
    const result = computeGameRankings(live, data.scores, data.votes, data.teams);
    const votedTeamIds =
      live.scoreSource === 'voting'
        ? [...new Set(data.votes.map((v) => v.votingTeamId))]
        : [];
    activeGame = {
      id: live.id,
      name: live.name,
      scoreUnit: live.scoreUnit,
      scoreType: live.scoreType,
      scoreSource: live.scoreSource,
      numRounds: live.numRounds,
      isProvisional: result.isProvisional,
      rankings: result.rankings.map((r) => ({
        teamId: r.teamId,
        combinedScore: r.combinedScore,
        place: r.place,
        isProvisional: r.isProvisional,
      })),
      votedTeamIds,
    };
  }

  return {
    active: true,
    year: year.year,
    isTest: year.isTest,
    locked: year.isLocked,
    hasStarted: year.hasStarted,
    displayMode: year.displayMode,
    podiumState: year.podiumState,
    teams,
    standings,
    activeGame,
    totalGames: data.games.length,
    completedGames: data.games.filter((g) => g.isComplete).length,
  };
}
