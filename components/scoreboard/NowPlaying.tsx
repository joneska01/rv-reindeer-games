"use client";

import { Medal } from "@/components/shared/Medal";
import { Badge } from "@/components/shared/Badge";
import { cn } from "@/lib/cn";
import { IDLE_LINES, pickLine } from "@/lib/copy";
import { IntermissionScene } from "@/components/decor/IntermissionScene";
import { Bubbles } from "@/components/decor/Bubbles";
import type { TeamVM } from "@/lib/view-models";
import type { SbActiveGame } from "@/lib/scoreboard";
import { TeamDot } from "@/components/shared/TeamDot";
import { BallotTracker } from "./BallotTracker";
import { VotePrompt } from "./VotePrompt";

/** Whole numbers stay whole; timed scores show up to 2 decimals (no float noise). */
function fmtScore(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
}

export function NowPlaying({
  teams,
  game,
  seed,
  voteUrl,
}: {
  teams: TeamVM[];
  game: SbActiveGame | null;
  seed: number;
  /** Where the QR code points; `null` when the host couldn't be determined. */
  voteUrl: string | null;
}) {
  const team = (id: string) => teams.find((t) => t.id === id);

  if (!game) {
    return (
      <div className="relative flex h-full flex-col items-center justify-center overflow-hidden text-center">
        <Bubbles />
        <div className="relative z-10 flex w-full flex-col items-center">
          <span className="mb-4 text-6xl">🥂</span>
          <p className="eyebrow mb-3 text-base">Intermission</p>
          <p className="max-w-md font-body text-2xl leading-relaxed text-cream/90">
            {pickLine(IDLE_LINES, seed)}
          </p>
          <IntermissionScene />
        </div>
      </div>
    );
  }

  const voting = game.scoreSource === "voting";

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between gap-2">
        {/* The "on air" sign: cherry neon with a lit dot says this is live right now. */}
        <p className="eyebrow neon-cherry animate-neon flex items-center gap-2.5">
          <span
            aria-hidden
            className="size-1.5 rounded-full bg-cherry shadow-[0_0_8px_var(--color-cherry)]"
          />
          {voting ? "Now Voting" : "Now Playing"}
        </p>
        <div className="flex items-center gap-1.5">
          {game.isProvisional && <Badge tone="amber">Round 1</Badge>}
          <Badge tone={game.scoreType === "low_wins" ? "sage" : "gold"}>
            {voting ? "Ballots" : game.scoreType === "low_wins" ? "Low wins" : "High wins"}
          </Badge>
        </div>
      </div>

      <h2 className="text-gilt mb-4 text-3xl leading-tight">{game.name}</h2>

      {game.votingOpen ? (
        // The server withholds the running tally while ballots are open — QR instead.
        <VotePrompt url={voteUrl} teams={teams} votedTeamIds={game.votedTeamIds} />
      ) : (
        <>
          {game.rankings.length === 0 ? (
            <p className="font-body text-sage">
              {voting ? "Ballots are coming in…" : "Scores coming in…"}
            </p>
          ) : (
            <ol className="space-y-2">
              {game.rankings.map((r) => {
                const t = team(r.teamId);
                return (
                  <li
                    key={r.teamId}
                    className={cn(
                      "flex items-center gap-3 rounded-card border border-gilt/40 px-3 py-2",
                      r.place === 1 ? "bg-gold/10" : "bg-forest-deep/40",
                    )}
                  >
                    <span className="flex w-8 justify-center">
                      <Medal rank={r.place} />
                    </span>
                    <TeamDot color={t?.color ?? "#888"} />
                    <span className="min-w-0 flex-1 truncate font-body text-cream">
                      {t?.name ?? "—"}
                    </span>
                    <span className="nums text-lg text-gilt">
                      {fmtScore(r.combinedScore)}
                      <span className="ml-1 text-xs text-sage/60">
                        {voting ? "pts" : game.scoreUnit}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ol>
          )}

          {voting && teams.length > 0 && (
            <BallotTracker teams={teams} votedTeamIds={game.votedTeamIds} />
          )}
        </>
      )}
    </div>
  );
}
