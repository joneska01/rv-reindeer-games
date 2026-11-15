/**
 * The plain, serializable shapes the server hands to client components, plus the
 * one mapper for each. Pure — no DB, no `server-only` — so pages, the scoreboard
 * builder and tests all import the same definitions instead of re-declaring them.
 */
import type { Team, Game, GameLibrary } from '@/db/schema';
import type { RankedTeam } from '@/lib/scoring';

export interface TeamVM {
  id: string;
  name: string;
  color: string;
}
export const toTeamVM = (t: Team): TeamVM => ({ id: t.id, name: t.name, color: t.displayColor });

export interface GameVM {
  id: string;
  name: string;
  scoringDescription: string;
  scoreType: Game['scoreType'];
  scoreSource: Game['scoreSource'];
  scoreUnit: string;
  numRounds: number;
  roundCombineMethod: Game['roundCombineMethod'];
  isComplete: boolean;
}
export const toGameVM = (g: Game): GameVM => ({
  id: g.id,
  name: g.name,
  scoringDescription: g.scoringDescription,
  scoreType: g.scoreType,
  scoreSource: g.scoreSource,
  scoreUnit: g.scoreUnit,
  numRounds: g.numRounds,
  roundCombineMethod: g.roundCombineMethod,
  isComplete: g.isComplete,
});

export interface LibraryGameVM {
  id: string;
  name: string;
  scoreType: GameLibrary['scoreType'];
  scoreSource: GameLibrary['scoreSource'];
  scoreUnit: string;
  defaultNumRounds: number;
  supplies: string;
  notes: string;
}
export const toLibraryGameVM = (l: GameLibrary): LibraryGameVM => ({
  id: l.id,
  name: l.name,
  scoreType: l.scoreType,
  scoreSource: l.scoreSource,
  scoreUnit: l.scoreUnit,
  defaultNumRounds: l.defaultNumRounds,
  supplies: l.supplies,
  notes: l.notes,
});

export interface StandingVM {
  teamId: string;
  rank: number;
  totalPoints: number;
  foulCount: number;
  gamesCompleted: number;
  isTied: boolean;
  unresolvedTie: boolean;
}
export const toStandingVM = (r: RankedTeam): StandingVM => ({
  teamId: r.teamId,
  rank: r.rank,
  totalPoints: r.totalPoints,
  foulCount: r.partyFoulCount,
  gamesCompleted: r.gamesCompleted,
  isTied: r.isTied,
  unresolvedTie: r.unresolvedTie,
});
