"use client";

import { Panel } from "@/components/shared/Panel";
import { Badge } from "@/components/shared/Badge";
import { Medal } from "@/components/shared/Medal";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { cn } from "@/lib/cn";
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

  const hasVoted = (id: string) => tally.votedTeamIds.includes(id);
  const pending = teams.filter((t) => !hasVoted(t.id)).length;
  // Couples who still need to vote come first so stragglers are obvious.
  const roster = [...teams].sort(
    (a, b) => Number(hasVoted(a.id)) - Number(hasVoted(b.id)),
  );

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

      {/* Who's voted — chase down stragglers before closing voting */}
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="eyebrow">Ballots In</p>
          {pending > 0 ? (
            <span className="text-xs text-amber">
              {pending} still to vote
            </span>
          ) : (
            <span className="text-xs text-gold-soft">All in ✓</span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {roster.map((t) => {
            const voted = hasVoted(t.id);
            return (
              <span
                key={t.id}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1 font-body text-sm",
                  voted
                    ? "border-gold/40 bg-gold/10 text-gold-soft"
                    : "border-amber/50 bg-amber/10 text-amber",
                )}
              >
                <span
                  className="size-2.5 rounded-full ring-1 ring-cream/20"
                  style={{ backgroundColor: t.color }}
                />
                {t.name}
                <span className="text-xs">{voted ? "✓" : "·"}</span>
              </span>
            );
          })}
        </div>
      </div>

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
              <span className="min-w-0 flex-1 truncate font-body text-cream">{name(row.teamId)}</span>
              <span className="nums text-gilt">{row.points} pts</span>
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}
