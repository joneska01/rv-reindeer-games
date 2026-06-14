import { VoteBooth } from "@/components/vote/VoteBooth";
import { getVotingState } from "@/lib/voting";

export const dynamic = "force-dynamic";
export const metadata = { title: "Costume Ballot — RV Reindeer Games" };

export default async function VotePage() {
  const initial = await getVotingState();
  // Votes poll a touch slower than the scoreboard (own env var, 10s default).
  const pollMs = Number(process.env.NEXT_PUBLIC_VOTES_POLL_INTERVAL_MS ?? 10000);
  return <VoteBooth initial={initial} pollMs={pollMs} />;
}
