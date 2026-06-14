import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, parseBody } from '@/lib/api';
import { db } from '@/lib/db';
import { years, games } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getYear } from '@/lib/years';

const schema = z.object({
  gameId: z.string().uuid(),
  complete: z.boolean(),
});

/**
 * Mark a game complete (it then counts toward the overall leaderboard) or
 * reopen it. Completing the active game also clears the year's active slot,
 * so the right-hand "now playing" panel empties out.
 */
export async function POST(req: NextRequest) {
  return requireAdmin(req, async () => {
    const parsed = await parseBody(req, schema);
    if (parsed.response) return parsed.response;
    const { gameId, complete } = parsed.data;

    const [game] = await db.select().from(games).where(eq(games.id, gameId)).limit(1);
    if (!game) return fail('Game not found.', 404);

    const year = await getYear(game.yearId);
    if (!year) return fail('Year not found.', 404);
    if (year.isLocked) return fail('This edition is locked.', 423);

    await db.transaction(async (tx) => {
      await tx
        .update(games)
        .set({ isComplete: complete, completedAt: complete ? new Date() : null })
        .where(eq(games.id, gameId));
      if (complete && year.activeGameId === gameId) {
        await tx.update(years).set({ activeGameId: null }).where(eq(years.id, year.id));
      }
    });

    const [updated] = await db.select().from(games).where(eq(games.id, gameId)).limit(1);
    return ok(updated);
  });
}
