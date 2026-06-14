import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, parseBody } from '@/lib/api';
import { db } from '@/lib/db';
import { games } from '@/db/schema';
import { getYear } from '@/lib/years';
import { nextSortOrder } from '@/lib/setup';

const createSchema = z.object({
  yearId: z.string().uuid(),
  name: z.string().trim().min(1).max(80),
  instructions: z.string().default(''),
  scoringDescription: z.string().default(''),
  scoreType: z.enum(['high_wins', 'low_wins']),
  scoreSource: z.enum(['manual', 'voting']),
  scoreUnit: z.string().trim().min(1).max(30).default('points'),
  numRounds: z.number().int().min(1).max(2).default(1),
  roundCombineMethod: z.enum(['sum', 'average']).default('sum'),
  libraryGameId: z.string().uuid().nullable().optional(),
});

export async function POST(req: NextRequest) {
  return requireAdmin(req, async () => {
    const parsed = await parseBody(req, createSchema);
    if (parsed.response) return parsed.response;
    const data = parsed.data;

    const year = await getYear(data.yearId);
    if (!year) return fail('Year not found.', 404);
    if (year.isLocked) return fail('This edition is locked.', 423);

    const sortOrder = await nextSortOrder(data.yearId);
    const [created] = await db
      .insert(games)
      .values({ ...data, libraryGameId: data.libraryGameId ?? null, sortOrder })
      .returning();
    return ok(created, 201);
  });
}
