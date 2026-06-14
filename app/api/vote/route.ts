import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, fail, parseBody } from '@/lib/api';
import { db } from '@/lib/db';
import { teams, costumeVotes } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getActiveYear } from '@/lib/years';
import { getVotingState, openVotingGame } from '@/lib/voting';

export const dynamic = 'force-dynamic';

/** GET — is voting open, and who can be voted for? */
export async function GET() {
  return ok(await getVotingState());
}

const voteSchema = z.object({
  votingTeamId: z.string().uuid(),
  firstPlaceTeamId: z.string().uuid(),
  secondPlaceTeamId: z.string().uuid(),
  thirdPlaceTeamId: z.string().uuid(),
});

/** POST — cast (or re-cast) a costume ballot. Upsert on (year, voting team). */
export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, voteSchema);
  if (parsed.response) return parsed.response;
  const v = parsed.data;

  const year = await getActiveYear();
  if (!year || year.isLocked) return fail('Voting is closed.', 409);

  const game = await openVotingGame(year.id, year.activeGameId);
  if (!game) return fail('Voting is closed.', 409);

  const picks = [v.firstPlaceTeamId, v.secondPlaceTeamId, v.thirdPlaceTeamId];
  if (new Set(picks).size !== 3) {
    return fail('Pick three different couples for 1st, 2nd, and 3rd.', 422);
  }

  // Every referenced team must belong to this edition.
  const ids = new Set([v.votingTeamId, ...picks]);
  const roster = await db.select({ id: teams.id }).from(teams).where(eq(teams.yearId, year.id));
  const valid = new Set(roster.map((r) => r.id));
  for (const id of ids) {
    if (!valid.has(id)) return fail('Unknown couple on the ballot.', 422);
  }

  const existing = await db
    .select({ id: costumeVotes.id })
    .from(costumeVotes)
    .where(and(eq(costumeVotes.yearId, year.id), eq(costumeVotes.votingTeamId, v.votingTeamId)))
    .limit(1);

  await db
    .insert(costumeVotes)
    .values({ yearId: year.id, ...v })
    .onConflictDoUpdate({
      target: [costumeVotes.yearId, costumeVotes.votingTeamId],
      set: {
        firstPlaceTeamId: v.firstPlaceTeamId,
        secondPlaceTeamId: v.secondPlaceTeamId,
        thirdPlaceTeamId: v.thirdPlaceTeamId,
        updatedAt: new Date(),
      },
    });

  return ok({ ok: true, updated: existing.length > 0 });
}
