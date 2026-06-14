"use client";

import { Medal } from "@/components/shared/Medal";
import { Badge } from "@/components/shared/Badge";
import { cn } from "@/lib/cn";
import { IDLE_LINES, pickLine } from "@/lib/copy";
import type { SbTeam, SbActiveGame } from "@/lib/scoreboard";

export function NowPlaying({
  teams,
  game,
  seed,
}: {
  teams: SbTeam[];
  game: SbActiveGame | null;
  seed: number;
}) {
  const team = (id: string) => teams.find((t) => t.id === id);

  if (!game) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <span className="mb-4 text-4xl">🥂</span>
        <p className="eyebrow mb-2">Intermission</p>
        <p className="max-w-xs font-body text-lg text-sage">{pickLine(IDLE_LINES, seed)}</p>
      </div>
    );
  }

  const voting = game.scoreSource === "voting";

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="eyebrow">{voting ? "Now Voting" : "Now Playing"}</p>
        <div className="flex items-center gap-1.5">
          {game.isProvisional && <Badge tone="amber">Round 1</Badge>}
          <Badge tone={game.scoreType === "low_wins" ? "sage" : "gold"}>
            {voting ? "Ballots" : game.scoreType === "low_wins" ? "Low wins" : "High wins"}
          </Badge>
        </div>
      </div>

      <h2 className="text-gilt mb-4 text-3xl leading-tight">{game.name}</h2>

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
                <span
                  className="size-3.5 shrink-0 rounded-full ring-1 ring-cream/20"
                  style={{ backgroundColor: t?.color ?? "#888" }}
                />
                <span className="min-w-0 flex-1 truncate font-body text-cream">{t?.name ?? "—"}</span>
                <span className="nums text-lg text-gilt">
                  {r.combinedScore}
                  <span className="ml-1 text-xs text-sage/60">
                    {voting ? "pts" : game.scoreUnit}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
