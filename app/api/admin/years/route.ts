import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, parseBody } from '@/lib/api';
import { db } from '@/lib/db';
import { years, teams } from '@/db/schema';
import { eq } from 'drizzle-orm';

const createSchema = z.object({
  year: z.number().int().min(2000).max(9999),
  isTest: z.boolean().default(false),
  copyTeamsFromYearId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  return requireAdmin(req, async () => {
    const parsed = await parseBody(req, createSchema);
    if (parsed.response) return parsed.response;
    const { year, isTest, copyTeamsFromYearId } = parsed.data;

    const existing = await db.select({ id: years.id }).from(years).where(eq(years.year, year)).limit(1);
    if (existing.length > 0) {
      return fail(`Year ${year} already exists.`, 409);
    }

    const [created] = await db
      .insert(years)
      .values({ year, isTest })
      .returning();

    if (copyTeamsFromYearId) {
      const source = await db
        .select({ name: teams.name, displayColor: teams.displayColor })
        .from(teams)
        .where(eq(teams.yearId, copyTeamsFromYearId));
      if (source.length > 0) {
        await db.insert(teams).values(
          source.map((t) => ({ yearId: created.id, name: t.name, displayColor: t.displayColor })),
        );
      }
    }

    return ok(created, 201);
  });
}
