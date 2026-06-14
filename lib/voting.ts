import 'server-only';
import { db } from '@/lib/db';
import { teams, games } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getActiveYear } from '@/lib/years';
import type { Game } from '@/db/schema';

export interface VoteTeam {
  id: string;
  name: string;
  color: string;
}

export interface VoteState {
  open: boolean;
  year?: number;
  yearId?: string;
  gameName?: string;
  teams?: VoteTeam[];
}

/** The active voting game for an edition, if voting is currently open. */
export async function openVotingGame(
  yearId: string,
  activeGameId: string | null,
): Promise<Game | null> {
  if (!activeGameId) return null;
  const [g] = await db.select().from(games).where(eq(games.id, activeGameId)).limit(1);
  if (!g || g.yearId !== yearId || g.scoreSource !== 'voting' || g.isComplete) return null;
  return g;
}

/** Shared by the public `/vote` page (SSR) and the polling API. */
export async function getVotingState(): Promise<VoteState> {
  const year = await getActiveYear();
  if (!year || year.isLocked) return { open: false };

  const game = await openVotingGame(year.id, year.activeGameId);
  if (!game) return { open: false, year: year.year };

  const roster = await db.select().from(teams).where(eq(teams.yearId, year.id));
  return {
    open: true,
    year: year.year,
    yearId: year.id,
    gameName: game.name,
    teams: roster.map((t) => ({ id: t.id, name: t.name, color: t.displayColor })),
  };
}
