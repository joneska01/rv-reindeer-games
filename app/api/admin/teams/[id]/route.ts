import { adminRoute } from '@/lib/admin-route';
import { ok, fail, parseBody, isUniqueViolation } from '@/lib/api';
import { db } from '@/lib/db';
import { teams } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { editableTeam } from '@/lib/guards';
import { patchTeamSchema } from '@/lib/schemas';
import { teamScoreCount } from '@/lib/setup';

export const PATCH = adminRoute<{ id: string }>(async (req, { id }) => {
  const parsed = await parseBody(req, patchTeamSchema);
  if (parsed.response) return parsed.response;

  await editableTeam(id);

  try {
    const [updated] = await db.update(teams).set(parsed.data).where(eq(teams.id, id)).returning();
    return ok(updated);
  } catch (e) {
    if (isUniqueViolation(e)) return fail('A team with that name already exists this year.', 409);
    throw e;
  }
});

export const DELETE = adminRoute<{ id: string }>(async (_req, { id }) => {
  await editableTeam(id);

  if ((await teamScoreCount(id)) > 0) {
    return fail('Cannot remove a team that already has scores.', 409);
  }

  await db.delete(teams).where(eq(teams.id, id));
  return ok({ deleted: id });
});
