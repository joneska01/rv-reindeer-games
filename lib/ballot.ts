/**
 * The rules of the tap-to-rank costume ballot, kept apart from the screen so they
 * are unit tested. A ballot is three "slots" (1st, 2nd, 3rd), each empty or holding
 * a couple's id.
 *
 * Why slots rather than an ordered list: undoing someone's 1st pick leaves 2nd and
 * 3rd exactly where they were, and the next tap refills the empty place. A list
 * would quietly promote everyone else.
 */
export type Slots = [string | null, string | null, string | null];

export const EMPTY_SLOTS: Slots = [null, null, null];

/**
 * Points for 1st / 2nd / 3rd, shown on the booth. The scoring engine applies them
 * (`aggregateVotePoints` in scoring.ts), so keep the two in step.
 */
export const RANK_POINTS = [10, 7, 5] as const;

/**
 * A tap on a couple. Unpicked → takes the best empty place. Picked → un-picks it.
 * If all three places are taken, tapping a new couple does nothing (they have to
 * un-pick one first). Returns a new array; never mutates.
 */
export function tapTeam(slots: Slots, teamId: string): Slots {
  const next: Slots = [...slots];
  const at = next.indexOf(teamId);
  if (at !== -1) {
    next[at] = null;
    return next;
  }
  const free = next.indexOf(null);
  if (free !== -1) next[free] = teamId;
  return next;
}

/** 1, 2 or 3 if this couple is picked, otherwise null. */
export function rankOf(slots: Slots, teamId: string): 1 | 2 | 3 | null {
  const at = slots.indexOf(teamId);
  return at === -1 ? null : ((at + 1) as 1 | 2 | 3);
}

/** The three fields the vote API expects, or null until every place is filled. */
export function toBallotPicks(slots: Slots) {
  const [first, second, third] = slots;
  if (!first || !second || !third) return null;
  return { firstPlaceTeamId: first, secondPlaceTeamId: second, thirdPlaceTeamId: third };
}
