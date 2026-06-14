/** Plain, serializable shapes passed from the Live page (server) to the
 *  client console. Numerics are pre-converted from Drizzle's string form. */

export interface LiveTeamVM {
  id: string;
  name: string;
  color: string;
}

export interface LiveGameVM {
  id: string;
  name: string;
  scoreType: "high_wins" | "low_wins";
  scoreSource: "manual" | "voting";
  scoreUnit: string;
  numRounds: number;
  roundCombineMethod: "sum" | "average";
  isComplete: boolean;
}

/** Existing score cell: gameId/teamId/round → value. */
export interface LiveScoreVM {
  gameId: string;
  teamId: string;
  round: number;
  value: number;
}

export interface LiveFoulVM {
  id: string;
  teamId: string;
  description: string | null;
}

export interface StandingVM {
  teamId: string;
  rank: number;
  totalPoints: number;
  foulCount: number;
  gamesCompleted: number;
  isTied: boolean;
  unresolvedTie: boolean;
}

/** Vote tally for the costume monitor. */
export interface VoteTallyVM {
  votesCast: number;
  totalVoters: number;
  rows: { teamId: string; points: number; place: number }[];
}
