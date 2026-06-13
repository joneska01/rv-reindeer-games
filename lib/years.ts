import 'server-only';
import { db } from '@/lib/db';
import { years, teams, games } from '@/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import type { Year } from '@/db/schema';

export interface YearWithCounts extends Year {
  teamCount: number;
  gameCount: number;
}

/** All years, newest first, with team & game counts for the admin list. */
export async function listYearsWithCounts(): Promise<YearWithCounts[]> {
  const rows = await db
    .select({
      year: years,
      teamCount: sql<number>`(select count(*)::int from ${teams} where ${teams.yearId} = ${years.id})`,
      gameCount: sql<number>`(select count(*)::int from ${games} where ${games.yearId} = ${years.id})`,
    })
    .from(years)
    .orderBy(desc(years.year));
  return rows.map((r) => ({ ...r.year, teamCount: r.teamCount, gameCount: r.gameCount }));
}

export async function getActiveYear(): Promise<Year | null> {
  const [y] = await db.select().from(years).where(eq(years.isActive, true)).limit(1);
  return y ?? null;
}

export async function getYear(id: string): Promise<Year | null> {
  const [y] = await db.select().from(years).where(eq(years.id, id)).limit(1);
  return y ?? null;
}
