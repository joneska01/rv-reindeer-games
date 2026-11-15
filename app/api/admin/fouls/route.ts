import { z } from 'zod';
import { adminRoute } from '@/lib/admin-route';
import { ok, fail, parseBody } from '@/lib/api';
import { db } from '@/lib/db';
import { partyFouls, teams } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { editableYear } from '@/lib/guards';
import { uuid } from '@/lib/schemas';

const schema = z.object({
  yearId: uuid,
  teamId: uuid,
  description: z.string().trim().max(140).optional(),
});

/**
 * Assess a party foul. Each row is one foul worth −1 — we never store a
 * counter, the engine counts rows.
 */
export const POST = adminRoute(async (req) => {
  const parsed = await parseBody(req, schema);
  if (parsed.response) return parsed.response;
  const { yearId, teamId, description } = parsed.data;

  await editableYear(yearId);

  const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
  if (!team || team.yearId !== yearId) return fail('Team not found in this edition.', 404);

  const [row] = await db
    .insert(partyFouls)
    .values({ yearId, teamId, description: description || null })
    .returning();
  return ok(row, 201);
});
