import 'server-only';
import { db } from '@/lib/db';
import { years, games, teams, partyFouls } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { Year, Game, Team, PartyFoul } from '@/db/schema';
import { ApiError, assertUnlocked } from '@/lib/api';

/**
 * "Load the thing → make sure it exists → make sure its edition isn't locked."
 * Every write route that edits an edition's data goes through one of these, so a
 * new route can't forget the lock check. Each loads the row and its year in a
 * single joined query. They throw `ApiError`, which `adminRoute` turns into JSON.
 */

export async function editableYear(yearId: string): Promise<Year> {
  const [year] = await db.select().from(years).where(eq(years.id, yearId)).limit(1);
  if (!year) throw new ApiError(404, 'Year not found.');
  assertUnlocked(year);
  return year;
}

export async function editableGame(gameId: string): Promise<{ game: Game; year: Year }> {
  const [row] = await db
    .select({ game: games, year: years })
    .from(games)
    .innerJoin(years, eq(games.yearId, years.id))
    .where(eq(games.id, gameId))
    .limit(1);
  if (!row) throw new ApiError(404, 'Game not found.');
  assertUnlocked(row.year);
  return row;
}

export async function editableTeam(teamId: string): Promise<{ team: Team; year: Year }> {
  const [row] = await db
    .select({ team: teams, year: years })
    .from(teams)
    .innerJoin(years, eq(teams.yearId, years.id))
    .where(eq(teams.id, teamId))
    .limit(1);
  if (!row) throw new ApiError(404, 'Team not found.');
  assertUnlocked(row.year);
  return row;
}

export async function editableFoul(foulId: string): Promise<{ foul: PartyFoul; year: Year }> {
  const [row] = await db
    .select({ foul: partyFouls, year: years })
    .from(partyFouls)
    .innerJoin(years, eq(partyFouls.yearId, years.id))
    .where(eq(partyFouls.id, foulId))
    .limit(1);
  if (!row) throw new ApiError(404, 'Foul not found.');
  assertUnlocked(row.year);
  return row;
}
