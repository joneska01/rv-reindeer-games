import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, parseBody } from '@/lib/api';
import { db } from '@/lib/db';
import { teams } from '@/db/schema';
import { getYear } from '@/lib/years';
import { teamCount, MAX_TEAMS } from '@/lib/setup';

const createSchema = z.object({
  yearId: z.string().uuid(),
  name: z.string().trim().min(1).max(60),
  displayColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a hex value like #C41E3A')
    .default('#C41E3A'),
});

export async function POST(req: NextRequest) {
  return requireAdmin(req, async () => {
    const parsed = await parseBody(req, createSchema);
    if (parsed.response) return parsed.response;
    const { yearId, name, displayColor } = parsed.data;

    const year = await getYear(yearId);
    if (!year) return fail('Year not found.', 404);
    if (year.isLocked) return fail('This edition is locked.', 423);

    if ((await teamCount(yearId)) >= MAX_TEAMS) {
      return fail(`Maximum of ${MAX_TEAMS} teams per edition.`, 409);
    }

    try {
      const [created] = await db.insert(teams).values({ yearId, name, displayColor }).returning();
      return ok(created, 201);
    } catch {
      return fail(`A team named "${name}" already exists this year.`, 409);
    }
  });
}
