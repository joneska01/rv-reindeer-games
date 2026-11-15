import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { adminRoute } from '@/lib/admin-route';
import { ok, fail, parseBody, ApiError } from '@/lib/api';
import { db } from '@/lib/db';
import { scores } from '@/db/schema';
import { editableGame } from '@/lib/guards';
import { uuid } from '@/lib/schemas';

const clearSchema = z.object({
  gameId: uuid,
  teamId: uuid,
  round: z.number().int().min(1).max(2),
});
const upsertSchema = clearSchema.extend({ rawScore: z.number().finite() });

/** The game must exist, be unlocked, and take manual entry (voting games score from ballots). */
async function manualGame(gameId: string) {
  const { game } = await editableGame(gameId);
  if (game.scoreSource === 'voting') {
    throw new ApiError(409, 'Voting games are scored from costume votes, not manual entry.');
  }
  return game;
}

/** Upsert one team's score for a given round (UNIQUE on game/team/round). */
export const POST = adminRoute(async (req) => {
  const parsed = await parseBody(req, upsertSchema);
  if (parsed.response) return parsed.response;
  const { gameId, teamId, round, rawScore } = parsed.data;

  const game = await manualGame(gameId);
  if (round > game.numRounds) return fail('Round exceeds this game\'s round count.', 422);

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

/** Clear one team's score for a round (when the host empties the field). */
export const DELETE = adminRoute(async (req) => {
  const parsed = await parseBody(req, clearSchema);
  if (parsed.response) return parsed.response;
  const { gameId, teamId, round } = parsed.data;

  await manualGame(gameId);

  await db
    .delete(scores)
    .where(and(eq(scores.gameId, gameId), eq(scores.teamId, teamId), eq(scores.round, round)));
  return ok({ cleared: { gameId, teamId, round } });
});
