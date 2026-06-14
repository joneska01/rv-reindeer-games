import 'server-only';
import { db } from '@/lib/db';
import { teams, games, scores, partyFouls, costumeVotes } from '@/db/schema';
import { eq, asc, inArray } from 'drizzle-orm';
import type { Team, Game, Score, PartyFoul, CostumeVote } from '@/db/schema';
import {
  computeLeaderboard,
  applyTieBreakers,
  type LeaderboardResult,
  type RankedTeam,
} from '@/lib/scoring';

export interface LiveData {
  teams: Team[];
  games: Game[];
  scores: Score[];
  fouls: PartyFoul[];
  votes: CostumeVote[];
}

/** Everything the Live console needs for one edition, in a single pass. */
export async function getLiveData(yearId: string): Promise<LiveData> {
  const [t, g, f, v] = await Promise.all([
    db.select().from(teams).where(eq(teams.yearId, yearId)).orderBy(asc(teams.createdAt)),
    db.select().from(games).where(eq(games.yearId, yearId)).orderBy(asc(games.sortOrder)),
    db.select().from(partyFouls).where(eq(partyFouls.yearId, yearId)).orderBy(asc(partyFouls.assessedAt)),
    db.select().from(costumeVotes).where(eq(costumeVotes.yearId, yearId)),
  ]);

  // Scores link to games, not the year — fetch by this edition's game ids.
  const gameIds = g.map((x) => x.id);
  const s = gameIds.length
    ? await db.select().from(scores).where(inArray(scores.gameId, gameIds))
    : [];

  return { teams: t, games: g, scores: s, fouls: f, votes: v };
}

export interface Standings {
  leaderboard: LeaderboardResult;
  ranked: RankedTeam[];
}

/** Run the single scoring engine over a LiveData snapshot. Shared by the
 *  Live console and the Closing page so the math lives in exactly one place. */
export function rankStandings(data: LiveData): Standings {
  const { teams: t, games: g, scores: s, votes: v, fouls: f } = data;
  const leaderboard = computeLeaderboard(g, s, v, t, f);
  const ranked = applyTieBreakers(t, leaderboard, g, s, v);
  return { leaderboard, ranked };
}
