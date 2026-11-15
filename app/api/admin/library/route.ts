import { adminRoute } from '@/lib/admin-route';
import { ok, parseBody } from '@/lib/api';
import { db } from '@/lib/db';
import { gameLibrary } from '@/db/schema';
import { createLibraryGameSchema } from '@/lib/schemas';

export const POST = adminRoute(async (req) => {
  const parsed = await parseBody(req, createLibraryGameSchema);
  if (parsed.response) return parsed.response;
  const [created] = await db.insert(gameLibrary).values(parsed.data).returning();
  return ok(created, 201);
});
