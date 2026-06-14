"use client";

import { Panel } from "@/components/shared/Panel";
import { GameControl } from "./GameControl";
import { ScoreEntry } from "./ScoreEntry";
import { CostumeMonitor } from "./CostumeMonitor";
import { NaughtyList } from "./NaughtyList";
import { StandingsPreview } from "./StandingsPreview";
import type {
  LiveGameVM,
  LiveTeamVM,
  LiveScoreVM,
  LiveFoulVM,
  StandingVM,
  VoteTallyVM,
} from "./types";

export function LiveConsole({
  yearId,
  locked,
  teams,
  games,
  scores,
  fouls,
  standings,
  activeGameId,
  voteTally,
}: {
  yearId: string;
  locked: boolean;
  teams: LiveTeamVM[];
  games: LiveGameVM[];
  scores: LiveScoreVM[];
  fouls: LiveFoulVM[];
  standings: StandingVM[];
  activeGameId: string | null;
  voteTally: VoteTallyVM;
}) {
  const activeGame = games.find((g) => g.id === activeGameId) ?? null;
  const activeScores = activeGame
    ? scores.filter((s) => s.gameId === activeGame.id)
    : [];

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2">
      {/* Left rail: pick what's live + assess fouls */}
      <div className="min-w-0 space-y-6">
        <GameControl
          yearId={yearId}
          games={games}
          activeGameId={activeGameId}
          locked={locked}
        />
        <NaughtyList yearId={yearId} teams={teams} fouls={fouls} locked={locked} />
      </div>

      {/* Right rail: score the active game + watch the standings */}
      <div className="min-w-0 space-y-6">
        {activeGame ? (
          activeGame.scoreSource === "voting" ? (
            <CostumeMonitor game={activeGame} teams={teams} tally={voteTally} />
          ) : (
            <ScoreEntry game={activeGame} teams={teams} scores={activeScores} />
          )
        ) : (
          <Panel tone="soft" className="ring-1 ring-gilt/30">
            <p className="text-sm text-sage">
              No game is live. Hit <span className="text-gold-soft">Set Active</span> on a
              game to start scoring it here.
            </p>
          </Panel>
        )}
        <StandingsPreview teams={teams} standings={standings} gamesTotal={games.length} />
      </div>
    </div>
  );
}
