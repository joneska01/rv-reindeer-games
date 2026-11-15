import { adminRoute } from '@/lib/admin-route';
import { ok, fail, parseBody } from '@/lib/api';
import { db } from '@/lib/db';
import { games } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { editableGame } from '@/lib/guards';
import { patchGameSchema } from '@/lib/schemas';
import { gameScoreCount } from '@/lib/setup';

export const PATCH = adminRoute<{ id: string }>(async (req, { id }) => {
  const parsed = await parseBody(req, patchGameSchema);
  if (parsed.response) return parsed.response;

  await editableGame(id);

  const [updated] = await db.update(games).set(parsed.data).where(eq(games.id, id)).returning();
  return ok(updated);
});

export const DELETE = adminRoute<{ id: string }>(async (_req, { id }) => {
  await editableGame(id);

  if ((await gameScoreCount(id)) > 0) {
    return fail('Cannot remove a game that already has scores.', 409);
  }

  await db.delete(games).where(eq(games.id, id));
  return ok({ deleted: id });
});
