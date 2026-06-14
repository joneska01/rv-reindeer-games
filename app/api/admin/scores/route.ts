import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, parseBody } from '@/lib/api';
import { db } from '@/lib/db';
import { games, scores } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { getYear } from '@/lib/years';

const upsertSchema = z.object({
  gameId: z.string().uuid(),
  teamId: z.string().uuid(),
  round: z.number().int().min(1).max(2),
  rawScore: z.number().finite(),
});

const clearSchema = z.object({
  gameId: z.string().uuid(),
  teamId: z.string().uuid(),
  round: z.number().int().min(1).max(2),
});

async function guard(gameId: string) {
  const [game] = await db.select().from(games).where(eq(games.id, gameId)).limit(1);
  if (!game) return { error: fail('Game not found.', 404) };
  const year = await getYear(game.yearId);
  if (year?.isLocked) return { error: fail('This edition is locked.', 423) };
  if (game.scoreSource === 'voting') {
    return { error: fail('Voting games are scored from costume votes, not manual entry.', 409) };
  }
  return { game };
}

/** Upsert one team's score for a given round (UNIQUE on game/team/round). */
export async function POST(req: NextRequest) {
  return requireAdmin(req, async () => {
    const parsed = await parseBody(req, upsertSchema);
    if (parsed.response) return parsed.response;
    const { gameId, teamId, round, rawScore } = parsed.data;

    const g = await guard(gameId);
    if (g.error) return g.error;
    if (round > g.game.numRounds) return fail('Round exceeds this game\'s round count.', 422);

    const [row] = await db
      .insert(scores)
      .values({ gameId, teamId, round, rawScore: String(rawScore) })
      .onConflictDoUpdate({
        target: [scores.gameId, scores.teamId, scores.round],
        set: { rawScore: String(rawScore), updatedAt: new Date() },
      })
      .returning();
    return ok(row);
  });
}

/** Clear one team's score for a round (when the host empties the field). */
export async function DELETE(req: NextRequest) {
  return requireAdmin(req, async () => {
    const parsed = await parseBody(req, clearSchema);
    if (parsed.response) return parsed.response;
    const { gameId, teamId, round } = parsed.data;

    const g = await guard(gameId);
    if (g.error) return g.error;

    await db
      .delete(scores)
      .where(
        and(eq(scores.gameId, gameId), eq(scores.teamId, teamId), eq(scores.round, round)),
      );
    return ok({ cleared: { gameId, teamId, round } });
  });
}
