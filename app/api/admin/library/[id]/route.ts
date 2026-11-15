import { adminRoute } from '@/lib/admin-route';
import { ok, fail, parseBody } from '@/lib/api';
import { db } from '@/lib/db';
import { gameLibrary } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { patchLibraryGameSchema } from '@/lib/schemas';

export const PATCH = adminRoute<{ id: string }>(async (req, { id }) => {
  const parsed = await parseBody(req, patchLibraryGameSchema);
  if (parsed.response) return parsed.response;
  const [updated] = await db.update(gameLibrary).set(parsed.data).where(eq(gameLibrary.id, id)).returning();
  if (!updated) return fail('Library game not found.', 404);
  return ok(updated);
});

export const DELETE = adminRoute<{ id: string }>(async (_req, { id }) => {
  // Year games keep their copied config; libraryGameId is set null by FK.
  const [deleted] = await db.delete(gameLibrary).where(eq(gameLibrary.id, id)).returning();
  if (!deleted) return fail('Library game not found.', 404);
  return ok({ deleted: id });
});
