import { headers } from "next/headers";
import { buildScoreboard } from "@/lib/scoreboard";
import { buildVoteUrl } from "@/lib/vote-url";
import { ScoreboardView } from "@/components/scoreboard/ScoreboardView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Scoreboard — RV Reindeer Games" };

export default async function ScoreboardPage() {
  const initial = await buildScoreboard();
  const pollMs = Number(process.env.NEXT_PUBLIC_POLL_INTERVAL_MS ?? 8000);

  // The QR points at whatever host this TV loaded, so there is no env var to keep in sync.
  const h = await headers();
  const voteUrl = buildVoteUrl(h.get("host"), h.get("x-forwarded-proto"));

  return <ScoreboardView initial={initial} pollMs={pollMs} voteUrl={voteUrl} />;
}
