import { z } from 'zod';
import { adminRoute } from '@/lib/admin-route';
import { ok, parseBody } from '@/lib/api';
import { db } from '@/lib/db';
import { years, games } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { editableGame } from '@/lib/guards';
import { uuid } from '@/lib/schemas';

const schema = z.object({
  gameId: uuid,
  complete: z.boolean(),
});

/**
 * Mark a game complete (it then counts toward the overall leaderboard) or
 * reopen it. Completing the active game also clears the year's active slot,
 * so the right-hand "now playing" panel empties out.
 */
export const POST = adminRoute(async (req) => {
  const parsed = await parseBody(req, schema);
  if (parsed.response) return parsed.response;
  const { gameId, complete } = parsed.data;

  const { year } = await editableGame(gameId);

  const updated = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(games)
      .set({ isComplete: complete, completedAt: complete ? new Date() : null })
      .where(eq(games.id, gameId))
      .returning();
    if (complete && year.activeGameId === gameId) {
      await tx.update(years).set({ activeGameId: null }).where(eq(years.id, year.id));
    }
    return row;
  });
  return ok(updated);
});
