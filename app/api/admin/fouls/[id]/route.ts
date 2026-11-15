import { adminRoute } from '@/lib/admin-route';
import { ok } from '@/lib/api';
import { db } from '@/lib/db';
import { partyFouls } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { editableFoul } from '@/lib/guards';

/** Rescind a single party foul (undo). */
export const DELETE = adminRoute<{ id: string }>(async (_req, { id }) => {
  await editableFoul(id);
  await db.delete(partyFouls).where(eq(partyFouls.id, id));
  return ok({ deleted: id });
});
