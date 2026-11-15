"use client";

import { Panel } from "@/components/shared/Panel";
import { Badge } from "@/components/shared/Badge";
import { Medal } from "@/components/shared/Medal";
import { SectionHeading } from "@/components/shared/SectionHeading";
import type { TeamVM, StandingVM } from "@/lib/view-models";
import { TeamDot } from "@/components/shared/TeamDot";

export function StandingsPreview({
  teams,
  standings,
  gamesTotal,
}: {
  teams: TeamVM[];
  standings: StandingVM[];
  gamesTotal: number;
}) {
  const team = (id: string) => teams.find((t) => t.id === id);

  return (
    <Panel tone="deep">
      <SectionHeading
        eyebrow="Live"
        title="Standings Preview"
        trailing={<span className="text-xs text-sage/60">completed games only</span>}
      />

      {standings.length === 0 ? (
        <p className="mt-3 text-sm italic text-sage/70">
          No teams yet — standings appear once games are completed.
        </p>
      ) : (
        <ol className="mt-3 space-y-1.5">
          {standings.map((s) => {
            const t = team(s.teamId);
            return (
              <li
                key={s.teamId}
                className="frame-gilt flex items-center gap-3 rounded-card bg-panel/50 px-3 py-2"
              >
                <span className="flex w-8 justify-center">
                  <Medal rank={s.rank} />
                </span>
                <TeamDot color={t?.color ?? "#888"} />
                <span className="min-w-0 flex-1 truncate font-body text-cream">{t?.name ?? "—"}</span>

                <div className="flex shrink-0 items-center gap-1.5">
                  {s.isTied && !s.unresolvedTie && <Badge tone="neutral">Tied</Badge>}
                  {s.unresolvedTie && <Badge tone="amber">Tie</Badge>}
                  {s.foulCount > 0 && (
                    <Badge tone="naughty">−{s.foulCount}</Badge>
                  )}
                </div>

                <span className="nums w-12 shrink-0 text-right text-sm text-sage/60">
                  {s.gamesCompleted}/{gamesTotal}
                </span>
                <span className="nums w-12 text-right text-lg text-gilt">{s.totalPoints}</span>
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}
