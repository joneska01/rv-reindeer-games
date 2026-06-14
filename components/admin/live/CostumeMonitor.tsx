"use client";

import { Panel } from "@/components/shared/Panel";
import { Badge } from "@/components/shared/Badge";
import { Medal } from "@/components/shared/Medal";
import { SectionHeading } from "@/components/shared/SectionHeading";
import type { LiveGameVM, LiveTeamVM, VoteTallyVM } from "./types";

export function CostumeMonitor({
  game,
  teams,
  tally,
}: {
  game: LiveGameVM;
  teams: LiveTeamVM[];
  tally: VoteTallyVM;
}) {
  const name = (id: string) => teams.find((t) => t.id === id)?.name ?? "—";
  const color = (id: string) => teams.find((t) => t.id === id)?.color ?? "#888";
  const pct = tally.totalVoters
    ? Math.round((tally.votesCast / tally.totalVoters) * 100)
    : 0;

  return (
    <Panel tone="soft" className="ring-1 ring-gold/40">
      <SectionHeading
        eyebrow="Now Voting"
        title={game.name}
        trailing={
          <Badge tone="cranberry">
            {tally.votesCast}/{tally.totalVoters} in
          </Badge>
        }
      />

      <div className="mt-3 h-2 overflow-hidden rounded-pill bg-forest-deep/60">
        <div
          className="h-full rounded-pill bg-gold/70 transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-sage/60">
        Couples vote at <span className="text-gold-soft">/vote</span>. 10 / 7 / 5 points
        for each ballot&rsquo;s 1st / 2nd / 3rd. &ldquo;Mark Done&rdquo; closes voting and
        folds the result into the standings.
      </p>

      <div className="mt-4 space-y-2">
        {tally.rows.length === 0 ? (
          <p className="text-sm italic text-sage/70">No ballots cast yet.</p>
        ) : (
          tally.rows.map((row) => (
            <div
              key={row.teamId}
              className="frame-gilt flex items-center gap-3 rounded-card bg-panel/60 px-3 py-2"
            >
              <Medal rank={row.place} />
              <span
                className="size-3.5 shrink-0 rounded-full ring-1 ring-cream/20"
                style={{ backgroundColor: color(row.teamId) }}
              />
              <span className="flex-1 truncate font-body text-cream">{name(row.teamId)}</span>
              <span className="nums text-gilt">{row.points} pts</span>
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}
