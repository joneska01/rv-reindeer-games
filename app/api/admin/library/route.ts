import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { ok, parseBody } from '@/lib/api';
import { db } from '@/lib/db';
import { gameLibrary } from '@/db/schema';

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  instructions: z.string().default(''),
  scoringDescription: z.string().default(''),
  scoreType: z.enum(['high_wins', 'low_wins']).default('high_wins'),
  scoreSource: z.enum(['manual', 'voting']).default('manual'),
  scoreUnit: z.string().trim().min(1).max(30).default('points'),
  defaultNumRounds: z.number().int().min(1).max(2).default(1),
  supplies: z.string().default(''),
  notes: z.string().default(''),
});

export async function POST(req: NextRequest) {
  return requireAdmin(req, async () => {
    const parsed = await parseBody(req, createSchema);
    if (parsed.response) return parsed.response;
    const [created] = await db.insert(gameLibrary).values(parsed.data).returning();
    return ok(created, 201);
  });
}
