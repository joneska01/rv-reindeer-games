import { VOTE_PROMPT } from "@/lib/copy";
import type { TeamVM } from "@/lib/view-models";
import { BallotTracker } from "./BallotTracker";
import { VoteQr } from "./VoteQr";

/**
 * Shown in the right-hand panel while costume voting is open: a big scannable
 * code and who has voted. The running tally is deliberately absent (the server
 * withholds it), so the reveal lands when the host completes the game.
 */
export function VotePrompt({
  url,
  teams,
  votedTeamIds,
}: {
  url: string | null;
  teams: TeamVM[];
  votedTeamIds: string[];
}) {
  // "rv-reindeer-games.vercel.app/vote" — for anyone who would rather type it.
  const shown = url?.replace(/^https?:\/\//, "");

  return (
    <div className="flex flex-1 flex-col items-center text-center">
      {url ? (
        // Sized from screen *height* (not width) so the tracker below always fits
        // without scrolling — a TV has no scroll wheel. ~7in across on a 50" screen.
        <div className="animate-glow w-[min(26rem,30vh)] rounded-panel">
          <VoteQr url={url} size={352} className="h-auto w-full rounded-panel" />
        </div>
      ) : (
        <p className="text-gilt my-6 text-6xl">/vote</p>
      )}

      <p className="text-gilt mt-5 text-3xl">{VOTE_PROMPT.headline}</p>
      <p className="mt-1 max-w-xs font-body text-sm text-sage">{VOTE_PROMPT.sub}</p>
      {shown && <p className="nums mt-2 text-sm text-gold-soft">{shown}</p>}

      <div className="w-full text-left">
        <BallotTracker teams={teams} votedTeamIds={votedTeamIds} />
      </div>
    </div>
  );
}
