import { buildScoreboard } from "@/lib/scoreboard";
import { ScoreboardView } from "@/components/scoreboard/ScoreboardView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Scoreboard — RV Reindeer Games" };

export default async function ScoreboardPage() {
  const initial = await buildScoreboard();
  const pollMs = Number(process.env.NEXT_PUBLIC_POLL_INTERVAL_MS ?? 8000);

  return <ScoreboardView initial={initial} pollMs={pollMs} />;
}
