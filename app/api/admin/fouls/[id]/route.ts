import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { ok, fail } from '@/lib/api';
import { db } from '@/lib/db';
import { partyFouls } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getYear } from '@/lib/years';

/** Rescind a single party foul (undo). */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return requireAdmin(req, async () => {
    const { id } = await params;
    const [foul] = await db.select().from(partyFouls).where(eq(partyFouls.id, id)).limit(1);
    if (!foul) return fail('Foul not found.', 404);

    const year = await getYear(foul.yearId);
    if (year?.isLocked) return fail('This edition is locked.', 423);

    await db.delete(partyFouls).where(eq(partyFouls.id, id));
    return ok({ deleted: id });
  });
}
