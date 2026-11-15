/** Live-console-only shapes. Teams, games and standings are shared: see
 *  `lib/view-models.ts`. Numerics are pre-converted from Drizzle's string form. */

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

/** Vote tally for the costume monitor. */
export interface VoteTallyVM {
  votesCast: number;
  totalVoters: number;
  votedTeamIds: string[];
  rows: { teamId: string; points: number; place: number }[];
}
