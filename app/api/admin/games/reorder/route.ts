import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, parseBody } from '@/lib/api';
import { db } from '@/lib/db';
import { games } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getYear } from '@/lib/years';

const reorderSchema = z.object({
  yearId: z.string().uuid(),
  orderedIds: z.array(z.string().uuid()).min(1),
});

export async function POST(req: NextRequest) {
  return requireAdmin(req, async () => {
    const parsed = await parseBody(req, reorderSchema);
    if (parsed.response) return parsed.response;
    const { yearId, orderedIds } = parsed.data;

    const year = await getYear(yearId);
    if (!year) return fail('Year not found.', 404);
    if (year.isLocked) return fail('This edition is locked.', 423);

    await db.transaction(async (tx) => {
      for (let i = 0; i < orderedIds.length; i++) {
        await tx
          .update(games)
          .set({ sortOrder: i + 1 })
          .where(eq(games.id, orderedIds[i]));
      }
    });

    return ok({ reordered: orderedIds.length });
  });
}
