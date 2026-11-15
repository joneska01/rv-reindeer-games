import Link from "next/link";
import { getActiveYear } from "@/lib/years";
import { getLiveData, rankStandings } from "@/lib/live";
import { computeGameRankings } from "@/lib/scoring";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { Panel } from "@/components/shared/Panel";
import { Badge } from "@/components/shared/Badge";
import { buttonClass } from "@/components/shared/Button";
import { LiveConsole } from "@/components/admin/live/LiveConsole";
import type { LiveScoreVM, LiveFoulVM, VoteTallyVM } from "@/components/admin/live/types";
import { toTeamVM, toGameVM, toStandingVM } from "@/lib/view-models";

export const metadata = { title: "Live Event — RV Reindeer Games" };

export default async function LivePage() {
  const active = await getActiveYear();

  if (!active) {
    return (
      <div className="space-y-8">
        <SectionHeading eyebrow="Live Mode" title="Run the Event" />
        <Panel>
          <p className="text-sm text-sage">
            No active edition yet. Head to <span className="text-gold-soft">Setup</span> and
            set one active first.
          </p>
        </Panel>
      </div>
    );
  }

  const data = await getLiveData(active.id);
  const { teams, games, scores, fouls, votes } = data;

  // Run the single engine: standings come from completed games minus fouls.
  const { ranked } = rankStandings(data);

  const teamVMs = teams.map(toTeamVM);
  const gameVMs = games.map(toGameVM);

  const scoreVMs: LiveScoreVM[] = scores.map((s) => ({
    gameId: s.gameId,
    teamId: s.teamId,
    round: s.round,
    value: Number(s.rawScore),
  }));

  const foulVMs: LiveFoulVM[] = fouls.map((f) => ({
    id: f.id,
    teamId: f.teamId,
    description: f.description,
  }));

  const standingVMs = ranked.map(toStandingVM);

  // Costume tally — only meaningful when the active game is a voting game.
  const activeGame = games.find((g) => g.id === active.activeGameId) ?? null;
  let voteTally: VoteTallyVM = {
    votesCast: 0,
    totalVoters: teams.length,
    votedTeamIds: [],
    rows: [],
  };
  if (activeGame?.scoreSource === "voting") {
    const { rankings } = computeGameRankings(activeGame, scores, votes, teams);
    const votedTeamIds = [...new Set(votes.map((v) => v.votingTeamId))];
    voteTally = {
      votesCast: votedTeamIds.length,
      totalVoters: teams.length,
      votedTeamIds,
      rows: rankings.map((r) => ({
        teamId: r.teamId,
        points: r.combinedScore,
        place: r.place,
      })),
    };
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionHeading
          eyebrow="Live Mode"
          title="Run the Event"
          trailing={
            <div className="flex items-center gap-2">
              <Badge tone="gold">{active.year}</Badge>
              {active.isTest && <Badge tone="amber">Test</Badge>}
              {active.isLocked && <Badge tone="cranberry">Locked</Badge>}
            </div>
          }
        />
        <Link href="/scoreboard" target="_blank" className={buttonClass("ghost", "sm")}>
          Open Scoreboard ↗
        </Link>
      </div>

      {active.isLocked && (
        <Panel tone="soft" className="ring-1 ring-cranberry/40">
          <p className="text-sm text-cream">
            This edition is locked — the results are final and editing is disabled. Reopen
            it from Closing to make changes.
          </p>
        </Panel>
      )}

      <LiveConsole
        yearId={active.id}
        locked={active.isLocked}
        teams={teamVMs}
        games={gameVMs}
        scores={scoreVMs}
        fouls={foulVMs}
        standings={standingVMs}
        activeGameId={active.activeGameId}
        voteTally={voteTally}
      />
    </div>
  );
}
