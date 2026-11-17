import 'server-only';
import { getActiveYear } from '@/lib/years';
import { getLiveData, rankStandings } from '@/lib/live';
import { computeGameRankings } from '@/lib/scoring';
import { toSbActiveGame } from '@/lib/active-game';
import { pickLastCompleted, toSbLastCompleted } from '@/lib/last-completed';
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
  /** Costume ballots are being accepted: the TV shows the QR, and `rankings` is withheld. */
  votingOpen: boolean;
  rankings: SbGameRank[];
  /** For voting games: team ids that have cast a ballot. */
  votedTeamIds: string[];
}

/** The game that finished most recently, with its podium, for the TV's winner card. */
export interface SbLastCompleted {
  gameId: string;
  name: string;
  scoreSource: 'manual' | 'voting';
  scoreUnit: string;
  /** ISO time; the TV compares these to tell a new finish from a reload. */
  completedAt: string;
  /** Top three places (all teams tied for one), best first. */
  podium: SbGameRank[];
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
  lastCompleted?: SbLastCompleted | null;
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
    activeGame = toSbActiveGame(live, result, data.votes, year.isLocked);
  }

  let lastCompleted: SbLastCompleted | null = null;
  const finished = pickLastCompleted(data.games);
  if (finished) {
    lastCompleted = toSbLastCompleted(
      finished,
      computeGameRankings(finished, data.scores, data.votes, data.teams),
    );
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
    lastCompleted,
    totalGames: data.games.length,
    completedGames: data.games.filter((g) => g.isComplete).length,
  };
}
