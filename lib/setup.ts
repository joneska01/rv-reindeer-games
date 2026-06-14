import 'server-only';
import { db } from '@/lib/db';
import { teams, games, gameLibrary, scores } from '@/db/schema';
import { eq, asc, count } from 'drizzle-orm';
import type { Team, Game, GameLibrary } from '@/db/schema';

export const MAX_TEAMS = 16;

export async function listTeams(yearId: string): Promise<Team[]> {
  return db.select().from(teams).where(eq(teams.yearId, yearId)).orderBy(asc(teams.createdAt));
}

export async function listGames(yearId: string): Promise<Game[]> {
  return db.select().from(games).where(eq(games.yearId, yearId)).orderBy(asc(games.sortOrder));
}

export async function listLibrary(): Promise<GameLibrary[]> {
  return db.select().from(gameLibrary).orderBy(asc(gameLibrary.name));
}

async function rowCount(col: typeof scores.teamId | typeof scores.gameId, id: string): Promise<number> {
  const [r] = await db.select({ n: count() }).from(scores).where(eq(col, id));
  return r?.n ?? 0;
}

export const teamScoreCount = (teamId: string) => rowCount(scores.teamId, teamId);
export const gameScoreCount = (gameId: string) => rowCount(scores.gameId, gameId);

export async function teamCount(yearId: string): Promise<number> {
  const [r] = await db.select({ n: count() }).from(teams).where(eq(teams.yearId, yearId));
  return r?.n ?? 0;
}

export async function nextSortOrder(yearId: string): Promise<number> {
  const rows = await db.select({ s: games.sortOrder }).from(games).where(eq(games.yearId, yearId));
  return rows.reduce((max, r) => Math.max(max, r.s), 0) + 1;
}
