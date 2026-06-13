import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, parseBody } from '@/lib/api';
import { db } from '@/lib/db';
import { gameLibrary } from '@/db/schema';
import { eq } from 'drizzle-orm';

const patchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  instructions: z.string().optional(),
  scoringDescription: z.string().optional(),
  scoreType: z.enum(['high_wins', 'low_wins']).optional(),
  scoreSource: z.enum(['manual', 'voting']).optional(),
  scoreUnit: z.string().trim().min(1).max(30).optional(),
  defaultNumRounds: z.number().int().min(1).max(2).optional(),
  supplies: z.string().optional(),
  notes: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return requireAdmin(req, async () => {
    const { id } = await params;
    const parsed = await parseBody(req, patchSchema);
    if (parsed.response) return parsed.response;
    const [updated] = await db.update(gameLibrary).set(parsed.data).where(eq(gameLibrary.id, id)).returning();
    if (!updated) return fail('Library game not found.', 404);
    return ok(updated);
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return requireAdmin(req, async () => {
    const { id } = await params;
    // Year games keep their copied config; libraryGameId is set null by FK.
    const [deleted] = await db.delete(gameLibrary).where(eq(gameLibrary.id, id)).returning();
    if (!deleted) return fail('Library game not found.', 404);
    return ok({ deleted: id });
  });
}
