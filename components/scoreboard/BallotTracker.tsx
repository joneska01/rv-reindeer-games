import { cn } from "@/lib/cn";
import { TeamDot } from "@/components/shared/TeamDot";
import type { TeamVM } from "@/lib/view-models";

/** "Ballots In 3/16" — couples who still owe a ballot sort first so stragglers are obvious. */
export function BallotTracker({
  teams,
  votedTeamIds,
}: {
  teams: TeamVM[];
  votedTeamIds: string[];
}) {
  const hasVoted = (id: string) => votedTeamIds.includes(id);

  return (
    <div className="mt-5">
      <p className="eyebrow mb-2">
        Ballots In · {votedTeamIds.length}/{teams.length}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {[...teams]
          .sort((a, b) => Number(hasVoted(a.id)) - Number(hasVoted(b.id)))
          .map((t) => {
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
                <TeamDot color={t.color} size="2.5" />
                {t.name}
                <span className="text-xs">{voted ? "✓" : "·"}</span>
              </span>
            );
          })}
      </div>
    </div>
  );
}
