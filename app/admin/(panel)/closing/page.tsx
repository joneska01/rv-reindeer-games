import { getActiveYear } from "@/lib/years";
import { getLiveData, rankStandings } from "@/lib/live";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { Panel } from "@/components/shared/Panel";
import { Badge } from "@/components/shared/Badge";
import { ClosingControls, type PodiumSeat } from "@/components/admin/ClosingControls";

export const metadata = { title: "Closing Ceremony — RV Reindeer Games" };

export default async function ClosingPage() {
  const active = await getActiveYear();

  if (!active) {
    return (
      <div className="space-y-8">
        <SectionHeading eyebrow="Closing" title="Closing Ceremony" />
        <Panel>
          <p className="text-sm text-sage">
            No active edition yet. Set one active in{" "}
            <span className="text-gold-soft">Setup</span> first.
          </p>
        </Panel>
      </div>
    );
  }

  const data = await getLiveData(active.id);
  const { ranked } = rankStandings(data);

  const teamMeta = (id: string) => data.teams.find((t) => t.id === id);
  const gamesComplete = data.games.filter((g) => g.isComplete).length;

  // Top-3 seats for the podium preview.
  const podium: PodiumSeat[] = ranked
    .filter((r) => r.rank <= 3)
    .map((r) => ({
      rank: r.rank,
      name: teamMeta(r.teamId)?.name ?? "—",
      color: teamMeta(r.teamId)?.displayColor ?? "#888",
      totalPoints: r.totalPoints,
      isTied: r.isTied,
    }));

  // Step-5 ties the engine couldn't break — the host settles these live.
  const unresolved = ranked.filter((r) => r.unresolvedTie);
  const unresolvedByRank = new Map<number, string[]>();
  for (const r of unresolved) {
    const list = unresolvedByRank.get(r.rank) ?? [];
    list.push(teamMeta(r.teamId)?.name ?? "—");
    unresolvedByRank.set(r.rank, list);
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Closing"
        title="Closing Ceremony"
        trailing={
          <div className="flex items-center gap-2">
            <Badge tone="gold">{active.year}</Badge>
            {active.isTest && <Badge tone="amber">Test</Badge>}
            {active.isLocked && <Badge tone="cranberry">Locked</Badge>}
          </div>
        }
      />

      {unresolvedByRank.size > 0 && (
        <Panel tone="soft" className="ring-1 ring-amber/50">
          <div className="flex items-start gap-3">
            <span className="text-xl leading-none">⚖️</span>
            <div className="space-y-1">
              <p className="font-display text-sm uppercase tracking-wider text-amber">
                Tie needs a human
              </p>
              {[...unresolvedByRank.entries()].map(([rank, names]) => (
                <p key={rank} className="text-sm text-cream">
                  Place {rank}: <span className="text-gold-soft">{names.join(" & ")}</span> are
                  level after all four tie-breakers.
                </p>
              ))}
              <p className="text-xs text-sage/70">
                Settle it live — a quick sudden-death round or coin flip — then adjust a score
                so the standings reflect the winner.
              </p>
            </div>
          </div>
        </Panel>
      )}

      <ClosingControls
        yearId={active.id}
        displayMode={active.displayMode}
        podiumState={active.podiumState}
        isLocked={active.isLocked}
        gamesComplete={gamesComplete}
        gamesTotal={data.games.length}
        podium={podium}
      />
    </div>
  );
}
