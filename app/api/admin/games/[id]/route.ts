import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, parseBody } from '@/lib/api';
import { db } from '@/lib/db';
import { games } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getYear } from '@/lib/years';
import { gameScoreCount } from '@/lib/setup';

const patchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  instructions: z.string().optional(),
  scoringDescription: z.string().optional(),
  scoreType: z.enum(['high_wins', 'low_wins']).optional(),
  scoreSource: z.enum(['manual', 'voting']).optional(),
  scoreUnit: z.string().trim().min(1).max(30).optional(),
  numRounds: z.number().int().min(1).max(2).optional(),
  roundCombineMethod: z.enum(['sum', 'average']).optional(),
});

async function loadGame(id: string) {
  const [g] = await db.select().from(games).where(eq(games.id, id)).limit(1);
  return g ?? null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return requireAdmin(req, async () => {
    const { id } = await params;
    const parsed = await parseBody(req, patchSchema);
    if (parsed.response) return parsed.response;

    const game = await loadGame(id);
    if (!game) return fail('Game not found.', 404);
    const year = await getYear(game.yearId);
    if (year?.isLocked) return fail('This edition is locked.', 423);

    const [updated] = await db.update(games).set(parsed.data).where(eq(games.id, id)).returning();
    return ok(updated);
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return requireAdmin(req, async () => {
    const { id } = await params;
    const game = await loadGame(id);
    if (!game) return fail('Game not found.', 404);
    const year = await getYear(game.yearId);
    if (year?.isLocked) return fail('This edition is locked.', 423);

    if ((await gameScoreCount(id)) > 0) {
      return fail('Cannot remove a game that already has scores.', 409);
    }

    await db.delete(games).where(eq(games.id, id));
    return ok({ deleted: id });
  });
}
