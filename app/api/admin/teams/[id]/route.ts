import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, parseBody, isUniqueViolation } from '@/lib/api';
import { db } from '@/lib/db';
import { teams } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getYear } from '@/lib/years';
import { teamScoreCount } from '@/lib/setup';

const patchSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  displayColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

async function loadTeam(id: string) {
  const [t] = await db.select().from(teams).where(eq(teams.id, id)).limit(1);
  return t ?? null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return requireAdmin(req, async () => {
    const { id } = await params;
    const parsed = await parseBody(req, patchSchema);
    if (parsed.response) return parsed.response;

    const team = await loadTeam(id);
    if (!team) return fail('Team not found.', 404);
    const year = await getYear(team.yearId);
    if (year?.isLocked) return fail('This edition is locked.', 423);

    try {
      const [updated] = await db.update(teams).set(parsed.data).where(eq(teams.id, id)).returning();
      return ok(updated);
    } catch (e) {
      if (isUniqueViolation(e)) return fail('A team with that name already exists this year.', 409);
      throw e;
    }
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return requireAdmin(req, async () => {
    const { id } = await params;
    const team = await loadTeam(id);
    if (!team) return fail('Team not found.', 404);
    const year = await getYear(team.yearId);
    if (year?.isLocked) return fail('This edition is locked.', 423);

    if ((await teamScoreCount(id)) > 0) {
      return fail('Cannot remove a team that already has scores.', 409);
    }

    await db.delete(teams).where(eq(teams.id, id));
    return ok({ deleted: id });
  });
}
