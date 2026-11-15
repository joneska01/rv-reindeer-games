import { adminRoute } from '@/lib/admin-route';
import { ok, parseBody } from '@/lib/api';
import { db } from '@/lib/db';
import { games } from '@/db/schema';
import { editableYear } from '@/lib/guards';
import { createGameSchema } from '@/lib/schemas';
import { nextSortOrder } from '@/lib/setup';

export const POST = adminRoute(async (req) => {
  const parsed = await parseBody(req, createGameSchema);
  if (parsed.response) return parsed.response;
  const data = parsed.data;

  await editableYear(data.yearId);

  const sortOrder = await nextSortOrder(data.yearId);
  const [created] = await db
    .insert(games)
    .values({ ...data, libraryGameId: data.libraryGameId ?? null, sortOrder })
    .returning();
  return ok(created, 201);
});
