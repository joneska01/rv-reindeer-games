"use client";

import { Panel } from "@/components/shared/Panel";
import { Button } from "@/components/shared/Button";
import { Badge } from "@/components/shared/Badge";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { cn } from "@/lib/cn";
import { useApi, jsonInit } from "@/lib/hooks/useApi";
import type { GameVM } from "@/lib/view-models";

export function GameControl({
  yearId,
  games,
  activeGameId,
  locked,
}: {
  yearId: string;
  games: GameVM[];
  activeGameId: string | null;
  locked: boolean;
}) {
  const { call, busy } = useApi();

  const setActive = (gameId: string | null) =>
    call("/api/admin/live/active-game", jsonInit("POST", { yearId, gameId }));

  const setComplete = (gameId: string, complete: boolean) =>
    call("/api/admin/live/complete", jsonInit("POST", { gameId, complete }));

  const remaining = games.filter((g) => !g.isComplete).length;

  return (
    <Panel>
      <SectionHeading
        eyebrow="Live"
        title="Game Control"
        trailing={
          <span className="nums text-sm text-sage/70">{remaining} to go</span>
        }
      />

      {games.length === 0 ? (
        <p className="mt-3 text-sm italic text-sage/70">
          No games on this edition yet. Add some in Setup.
        </p>
      ) : (
        <ol className="mt-3 space-y-2">
          {games.map((g, i) => {
            const isActive = g.id === activeGameId;
            return (
              <li
                key={g.id}
                className={cn(
                  "frame-gilt flex flex-wrap items-center gap-3 rounded-card px-3 py-2.5 transition-colors",
                  isActive ? "bg-gold/15 ring-1 ring-gold/40" : "bg-panel/60",
                )}
              >
                <span className="nums w-6 text-center text-sm text-sage/60">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate font-body text-cream">{g.name}</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {g.scoreSource === "voting" && <Badge tone="cranberry">Voting</Badge>}
                  {g.numRounds === 2 && <Badge tone="neutral">2 rounds</Badge>}
                  {isActive && <Badge tone="gold">● Live</Badge>}
                  {g.isComplete && <Badge tone="sage">Done</Badge>}
                </div>

                {!locked && (
                  <div className="flex items-center gap-1.5">
                    {g.isComplete ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => setComplete(g.id, false)}
                      >
                        Reopen
                      </Button>
                    ) : (
                      <>
                        {isActive ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={() => setActive(null)}
                          >
                            Pause
                          </Button>
                        ) : (
                          <Button size="sm" disabled={busy} onClick={() => setActive(g.id)}>
                            Set Active
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => setComplete(g.id, true)}
                        >
                          Mark Done
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}
