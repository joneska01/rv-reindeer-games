import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, parseBody } from '@/lib/api';
import { db } from '@/lib/db';
import { years } from '@/db/schema';
import { eq } from 'drizzle-orm';

const patchSchema = z.object({
  isActive: z.boolean().optional(),
  displayMode: z.enum(['scoreboard', 'podium', 'final_results']).optional(),
  podiumState: z.enum(['hidden', 'show_third', 'show_second', 'show_first', 'show_all']).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return requireAdmin(req, async () => {
    const { id } = await params;
    const parsed = await parseBody(req, patchSchema);
    if (parsed.response) return parsed.response;
    const body = parsed.data;

    const [target] = await db.select().from(years).where(eq(years.id, id)).limit(1);
    if (!target) return fail('Year not found.', 404);

    // Setting a year active must atomically clear any other active year.
    if (body.isActive === true) {
      await db.transaction(async (tx) => {
        await tx.update(years).set({ isActive: false }).where(eq(years.isActive, true));
        await tx.update(years).set({ isActive: true }).where(eq(years.id, id));
      });
    }

    const rest: Partial<typeof years.$inferInsert> = {};
    if (body.isActive === false) rest.isActive = false;
    if (body.displayMode !== undefined) rest.displayMode = body.displayMode;
    if (body.podiumState !== undefined) rest.podiumState = body.podiumState;

    if (Object.keys(rest).length > 0) {
      await db.update(years).set(rest).where(eq(years.id, id));
    }

    const [updated] = await db.select().from(years).where(eq(years.id, id)).limit(1);
    return ok(updated);
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return requireAdmin(req, async () => {
    const { id } = await params;
    const [target] = await db.select().from(years).where(eq(years.id, id)).limit(1);
    if (!target) return fail('Year not found.', 404);
    if (!target.isTest) return fail('Only test years can be deleted.', 403);

    // FK cascades remove teams, games, scores, fouls, and votes.
    await db.delete(years).where(eq(years.id, id));
    return ok({ deleted: id });
  });
}
