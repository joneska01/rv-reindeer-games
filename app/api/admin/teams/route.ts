import { adminRoute } from '@/lib/admin-route';
import { ok, fail, parseBody, isUniqueViolation } from '@/lib/api';
import { db } from '@/lib/db';
import { teams } from '@/db/schema';
import { editableYear } from '@/lib/guards';
import { createTeamSchema } from '@/lib/schemas';
import { teamCount, MAX_TEAMS } from '@/lib/setup';

export const POST = adminRoute(async (req) => {
  const parsed = await parseBody(req, createTeamSchema);
  if (parsed.response) return parsed.response;
  const { yearId, name, displayColor } = parsed.data;

  await editableYear(yearId);

  if ((await teamCount(yearId)) >= MAX_TEAMS) {
    return fail(`Maximum of ${MAX_TEAMS} teams per edition.`, 409);
  }

  try {
    const [created] = await db.insert(teams).values({ yearId, name, displayColor }).returning();
    return ok(created, 201);
  } catch (e) {
    if (isUniqueViolation(e)) return fail(`A team named "${name}" already exists this year.`, 409);
    throw e;
  }
});
