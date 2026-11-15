"use client";

import { StandingsBoard } from "./StandingsBoard";
import type { TeamVM, StandingVM } from "@/lib/view-models";

export function FinalResults({
  teams,
  standings,
  year,
}: {
  teams: TeamVM[];
  standings: StandingVM[];
  year?: number;
}) {
  const champ = standings.find((s) => s.rank === 1);
  const champName = champ ? teams.find((t) => t.id === champ.teamId)?.name : null;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-8 text-center">
        <p className="eyebrow mb-2">Final Results · {year ?? ""}</p>
        <h1 className="text-gilt text-5xl">The Final Tally</h1>
        {champName && (
          <p className="mt-4 font-body text-lg text-sage">
            Crowned champions:{" "}
            <span className="text-gilt">{champName}</span> 🏆
          </p>
        )}
      </div>
      <StandingsBoard teams={teams} standings={standings} title="Final Standings" />
    </div>
  );
}
