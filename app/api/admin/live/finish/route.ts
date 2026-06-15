import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, parseBody } from '@/lib/api';
import { db } from '@/lib/db';
import { years, games } from '@/db/schema';
import { eq, and, count } from 'drizzle-orm';
import { getYear } from '@/lib/years';

const schema = z.object({
  yearId: z.string().uuid(),
  lock: z.boolean(),
});

/**
 * Close out (or reopen) an edition. Locking freezes all editing and drops the
 * TV into the podium "curtain down" drumroll screen — NOT the final standings,
 * so the host can run the podium reveal without spoiling it. Requires at least
 * one completed game. Reopening returns the display to the scoreboard.
 */
export async function POST(req: NextRequest) {
  return requireAdmin(req, async () => {
    const parsed = await parseBody(req, schema);
    if (parsed.response) return parsed.response;
    const { yearId, lock } = parsed.data;

    const year = await getYear(yearId);
    if (!year) return fail('Year not found.', 404);

    if (lock) {
      const [c] = await db
        .select({ n: count() })
        .from(games)
        .where(and(eq(games.yearId, yearId), eq(games.isComplete, true)));
      if ((c?.n ?? 0) === 0) {
        return fail('Complete at least one game before finishing the event.', 409);
      }
      await db
        .update(years)
        .set({
          isLocked: true,
          displayMode: 'podium',
          podiumState: 'hidden',
          activeGameId: null,
        })
        .where(eq(years.id, yearId));
    } else {
      await db
        .update(years)
        .set({ isLocked: false, displayMode: 'scoreboard' })
        .where(eq(years.id, yearId));
    }

    const updated = await getYear(yearId);
    return ok(updated);
  });
}
