import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, parseBody } from '@/lib/api';
import { db } from '@/lib/db';
import { years, games } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getYear } from '@/lib/years';

const schema = z.object({
  yearId: z.string().uuid(),
  gameId: z.string().uuid().nullable(),
});

/**
 * Set (or clear) the active game for an edition. Because `active_game_id`
 * is a single column on the year row, writing a new value atomically
 * replaces the previous one — that column is the single source of truth.
 */
export async function POST(req: NextRequest) {
  return requireAdmin(req, async () => {
    const parsed = await parseBody(req, schema);
    if (parsed.response) return parsed.response;
    const { yearId, gameId } = parsed.data;

    const year = await getYear(yearId);
    if (!year) return fail('Year not found.', 404);
    if (year.isLocked) return fail('This edition is locked.', 423);

    if (gameId) {
      const [g] = await db.select().from(games).where(eq(games.id, gameId)).limit(1);
      if (!g || g.yearId !== yearId) return fail('Game not found in this edition.', 404);
      if (g.isComplete) return fail('That game is already complete.', 409);
    }

    await db.update(years).set({ activeGameId: gameId }).where(eq(years.id, yearId));
    const updated = await getYear(yearId);
    return ok(updated);
  });
}
