import { adminRoute } from '@/lib/admin-route';
import { ok, ApiError } from '@/lib/api';
import { db } from '@/lib/db';
import { years, games, scores, costumeVotes, partyFouls } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { getYear } from '@/lib/years';

/**
 * Wipe a TEST edition back to a pre-event slate for rehearsals: clears all
 * scores, costume votes, and party fouls, marks every game incomplete, and
 * resets the display state. Teams and game definitions are kept so you can run
 * it again. Test editions only — never touches a real event's results.
 */
export const POST = adminRoute<{ id: string }>(async (_req, { id }) => {
  const year = await getYear(id);
  if (!year) throw new ApiError(404, 'Year not found.');
  if (!year.isTest) throw new ApiError(403, 'Only test editions can be reset.');

  await db.transaction(async (tx) => {
    const gs = await tx.select({ id: games.id }).from(games).where(eq(games.yearId, id));
    const gameIds = gs.map((g) => g.id);
    if (gameIds.length > 0) {
      await tx.delete(scores).where(inArray(scores.gameId, gameIds));
    }
    await tx.delete(costumeVotes).where(eq(costumeVotes.yearId, id));
    await tx.delete(partyFouls).where(eq(partyFouls.yearId, id));
    await tx.update(games).set({ isComplete: false, completedAt: null }).where(eq(games.yearId, id));
    await tx
      .update(years)
      .set({
        activeGameId: null,
        displayMode: 'scoreboard',
        podiumState: 'hidden',
        isLocked: false,
        hasStarted: false,
      })
      .where(eq(years.id, id));
  });

  return ok({ reset: id });
});
