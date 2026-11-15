"use client";

import { Medal } from "@/components/shared/Medal";
import { Badge } from "@/components/shared/Badge";
import { cn } from "@/lib/cn";
import type { TeamVM, StandingVM } from "@/lib/view-models";
import { TeamDot } from "@/components/shared/TeamDot";

export function StandingsBoard({
  teams,
  standings,
  title = "Standings",
  dense = false,
}: {
  teams: TeamVM[];
  standings: StandingVM[];
  title?: string;
  dense?: boolean;
}) {
  const team = (id: string) => teams.find((t) => t.id === id);

  return (
    <div className="flex h-full flex-col">
      <p className="eyebrow mb-3">{title}</p>
      {standings.length === 0 ? (
        <p className="text-sm italic text-sage/70">No standings yet.</p>
      ) : (
        <ol className={cn("space-y-2", dense && "space-y-1.5")}>
          {standings.map((s) => {
            const t = team(s.teamId);
            const champ = s.rank === 1;
            return (
              <li
                key={s.teamId}
                className={cn(
                  "frame-gilt flex items-center gap-3 rounded-card px-3",
                  dense ? "py-2" : "py-2.5",
                  champ ? "bg-gold/12 ring-1 ring-gold/35" : "bg-panel/55",
                )}
              >
                <span className="flex w-9 shrink-0 justify-center">
                  <Medal rank={s.rank} />
                </span>
                <TeamDot color={t?.color ?? "#888"} size="4" />
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate font-body text-cream",
                    dense ? "text-base" : "text-lg",
                    champ && "text-gilt",
                  )}
                >
                  {t?.name ?? "—"}
                </span>

                {s.isTied && !s.unresolvedTie && <Badge tone="neutral">Tied</Badge>}
                {s.unresolvedTie && <Badge tone="amber">Tie</Badge>}
                {s.foulCount > 0 && <Badge tone="naughty">−{s.foulCount}</Badge>}

                <span
                  className={cn(
                    "nums shrink-0 text-right text-gilt",
                    dense ? "w-12 text-lg" : "w-16 text-2xl",
                  )}
                >
                  {s.totalPoints}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
