import { adminRoute } from '@/lib/admin-route';
import { ok, parseBody, ApiError } from '@/lib/api';
import { db } from '@/lib/db';
import { years } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getYear } from '@/lib/years';
import { patchYearSchema } from '@/lib/schemas';

export const PATCH = adminRoute<{ id: string }>(async (req, { id }) => {
  const parsed = await parseBody(req, patchYearSchema);
  if (parsed.response) return parsed.response;
  const body = parsed.data;

  if (!(await getYear(id))) throw new ApiError(404, 'Year not found.');

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

  return ok(await getYear(id));
});

export const DELETE = adminRoute<{ id: string }>(async (_req, { id }) => {
  const target = await getYear(id);
  if (!target) throw new ApiError(404, 'Year not found.');
  if (!target.isTest) throw new ApiError(403, 'Only test years can be deleted.');

  // FK cascades remove teams, games, scores, fouls, and votes.
  await db.delete(years).where(eq(years.id, id));
  return ok({ deleted: id });
});
