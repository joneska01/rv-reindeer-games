import { z } from 'zod';
import { adminRoute } from '@/lib/admin-route';
import { ok, fail, parseBody } from '@/lib/api';
import { db } from '@/lib/db';
import { years, games } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getYear } from '@/lib/years';
import { editableYear } from '@/lib/guards';
import { uuid } from '@/lib/schemas';

const schema = z.object({
  yearId: uuid,
  gameId: uuid.nullable(),
});

/**
 * Set (or clear) the active game for an edition. Because `active_game_id`
 * is a single column on the year row, writing a new value atomically
 * replaces the previous one — that column is the single source of truth.
 */
export const POST = adminRoute(async (req) => {
  const parsed = await parseBody(req, schema);
  if (parsed.response) return parsed.response;
  const { yearId, gameId } = parsed.data;

  await editableYear(yearId);

  if (gameId) {
    const [g] = await db.select().from(games).where(eq(games.id, gameId)).limit(1);
    if (!g || g.yearId !== yearId) return fail('Game not found in this edition.', 404);
    if (g.isComplete) return fail('That game is already complete.', 409);
  }

  // Setting a game live marks the edition started (one-way until reset), so
  // the scoreboard leaves the welcome screen for good.
  await db
    .update(years)
    .set(gameId ? { activeGameId: gameId, hasStarted: true } : { activeGameId: null })
    .where(eq(years.id, yearId));
  return ok(await getYear(yearId));
});
