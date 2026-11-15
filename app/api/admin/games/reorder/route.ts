import { z } from 'zod';
import { sql, and, eq, inArray } from 'drizzle-orm';
import { adminRoute } from '@/lib/admin-route';
import { ok, parseBody, ApiError } from '@/lib/api';
import { db } from '@/lib/db';
import { games } from '@/db/schema';
import { editableYear } from '@/lib/guards';
import { uuid } from '@/lib/schemas';

const reorderSchema = z.object({
  yearId: uuid,
  orderedIds: z.array(uuid).min(1),
});

export const POST = adminRoute(async (req) => {
  const parsed = await parseBody(req, reorderSchema);
  if (parsed.response) return parsed.response;
  const { yearId, orderedIds } = parsed.data;

  await editableYear(yearId);

  // One statement: sort_order = CASE id WHEN … THEN position END, limited to this
  // edition's games. If any id isn't one of them the transaction rolls back.
  const position = sql.join(
    orderedIds.map((id, i) => sql`when ${id}::uuid then ${i + 1}::int`),
    sql` `,
  );
  const updated = await db.transaction(async (tx) => {
    const rows = await tx
      .update(games)
      .set({ sortOrder: sql`case ${games.id} ${position} end` })
      .where(and(eq(games.yearId, yearId), inArray(games.id, orderedIds)))
      .returning({ id: games.id });
    if (rows.length !== orderedIds.length) {
      throw new ApiError(422, 'Those games are not all part of this edition.');
    }
    return rows.length;
  });

  return ok({ reordered: updated });
});
