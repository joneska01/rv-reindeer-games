import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, parseBody } from '@/lib/api';
import { db } from '@/lib/db';
import { partyFouls, teams } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getYear } from '@/lib/years';

const schema = z.object({
  yearId: z.string().uuid(),
  teamId: z.string().uuid(),
  description: z.string().trim().max(140).optional(),
});

/**
 * Assess a party foul. Each row is one foul worth −1 — we never store a
 * counter, the engine counts rows.
 */
export async function POST(req: NextRequest) {
  return requireAdmin(req, async () => {
    const parsed = await parseBody(req, schema);
    if (parsed.response) return parsed.response;
    const { yearId, teamId, description } = parsed.data;

    const year = await getYear(yearId);
    if (!year) return fail('Year not found.', 404);
    if (year.isLocked) return fail('This edition is locked.', 423);

    const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
    if (!team || team.yearId !== yearId) return fail('Team not found in this edition.', 404);

    const [row] = await db
      .insert(partyFouls)
      .values({ yearId, teamId, description: description || null })
      .returning();
    return ok(row, 201);
  });
}
