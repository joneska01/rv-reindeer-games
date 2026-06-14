import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { ok, fail } from '@/lib/api';
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
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return requireAdmin(req, async () => {
    const { id } = await params;
    const year = await getYear(id);
    if (!year) return fail('Year not found.', 404);
    if (!year.isTest) return fail('Only test editions can be reset.', 403);

    await db.transaction(async (tx) => {
      const gs = await tx.select({ id: games.id }).from(games).where(eq(games.yearId, id));
      const gameIds = gs.map((g) => g.id);
      if (gameIds.length > 0) {
        await tx.delete(scores).where(inArray(scores.gameId, gameIds));
      }
      await tx.delete(costumeVotes).where(eq(costumeVotes.yearId, id));
      await tx.delete(partyFouls).where(eq(partyFouls.yearId, id));
      await tx
        .update(games)
        .set({ isComplete: false, completedAt: null })
        .where(eq(games.yearId, id));
      await tx
        .update(years)
        .set({
          activeGameId: null,
          displayMode: 'scoreboard',
          podiumState: 'hidden',
          isLocked: false,
        })
        .where(eq(years.id, id));
    });

    return ok({ reset: id });
  });
}
