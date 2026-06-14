import { VoteBooth } from "@/components/vote/VoteBooth";
import { getVotingState } from "@/lib/voting";

export const dynamic = "force-dynamic";
export const metadata = { title: "Costume Ballot — RV Reindeer Games" };

export default async function VotePage() {
  const initial = await getVotingState();
  const pollMs = Number(process.env.NEXT_PUBLIC_POLL_INTERVAL_MS ?? 8000);
  // Votes poll a touch slower than the scoreboard.
  return <VoteBooth initial={initial} pollMs={Math.max(pollMs, 10000)} />;
}
