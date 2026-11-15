"use client";

import { Panel } from "@/components/shared/Panel";
import { Button } from "@/components/shared/Button";
import { Badge } from "@/components/shared/Badge";
import { Medal } from "@/components/shared/Medal";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { cn } from "@/lib/cn";
import { useApi, jsonInit } from "@/lib/hooks/useApi";

type DisplayMode = "scoreboard" | "podium" | "final_results";
type PodiumState = "hidden" | "show_third" | "show_second" | "show_first" | "show_all";

export interface PodiumSeat {
  rank: number;
  name: string;
  color: string;
  totalPoints: number;
  isTied: boolean;
}

const DISPLAY_TABS: { mode: DisplayMode; label: string; hint: string }[] = [
  { mode: "scoreboard", label: "Split Scoreboard", hint: "Standings + live game" },
  { mode: "podium", label: "Podium Reveal", hint: "Dramatic, one place at a time" },
  { mode: "final_results", label: "Final Results", hint: "Full standings, all at once" },
];

const PODIUM_STEPS: { state: PodiumState; label: string }[] = [
  { state: "hidden", label: "Curtain Down" },
  { state: "show_third", label: "Reveal 3rd" },
  { state: "show_second", label: "Reveal 2nd" },
  { state: "show_first", label: "Reveal 1st" },
  { state: "show_all", label: "Reveal All" },
];

export function ClosingControls({
  yearId,
  displayMode,
  podiumState,
  isLocked,
  gamesComplete,
  gamesTotal,
  podium,
}: {
  yearId: string;
  displayMode: DisplayMode;
  podiumState: PodiumState;
  isLocked: boolean;
  gamesComplete: number;
  gamesTotal: number;
  podium: PodiumSeat[];
}) {
  const { call, busy, error } = useApi();
  const yearUrl = `/api/admin/years/${yearId}`;

  const setMode = (mode: DisplayMode) =>
    call(
      yearUrl,
      // Entering podium starts with the curtain down for a clean reveal.
      jsonInit("PATCH", mode === "podium" ? { displayMode: mode, podiumState: "hidden" } : { displayMode: mode }),
    );

  const setPodium = (state: PodiumState) =>
    call(yearUrl, jsonInit("PATCH", { displayMode: "podium", podiumState: state }));

  const finish = (lock: boolean) =>
    call("/api/admin/live/finish", jsonInit("POST", { yearId, lock }));

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-card border border-cranberry/50 bg-cranberry/15 px-4 py-2.5 text-sm text-cream">
          {error}
        </p>
      )}

      {/* ── TV display mode ─────────────────────────────────────────── */}
      <Panel>
        <SectionHeading eyebrow="Closing" title="What the TV Shows" />
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {DISPLAY_TABS.map((t) => {
            const active = displayMode === t.mode;
            return (
              <button
                key={t.mode}
                onClick={() => setMode(t.mode)}
                disabled={busy}
                className={cn(
                  "frame-gilt rounded-card px-4 py-3 text-left transition-colors",
                  active ? "bg-gold/15 ring-1 ring-gold/40" : "bg-panel/60 hover:bg-panel",
                )}
              >
                <span className="block font-display text-sm uppercase tracking-wider text-cream">
                  {t.label}
                </span>
                <span className="mt-0.5 block text-xs text-sage/70">{t.hint}</span>
                {active && (
                  <Badge tone="gold" className="mt-2">
                    ● On Screen
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </Panel>

      {/* ── Podium reveal stepper ───────────────────────────────────── */}
      <Panel tone={displayMode === "podium" ? "soft" : "panel"} className={cn(displayMode === "podium" && "ring-1 ring-gold/40")}>
        <SectionHeading
          eyebrow="Closing"
          title="Podium Reveal"
          trailing={
            displayMode !== "podium" ? (
              <span className="text-xs text-sage/60">switch the TV to Podium first</span>
            ) : (
              <Badge tone="gold">{podiumState.replace("show_", "").replace("_", " ")}</Badge>
            )
          }
        />

        <div className="mt-3 flex flex-wrap gap-2">
          {PODIUM_STEPS.map((s) => {
            const active = podiumState === s.state && displayMode === "podium";
            return (
              <Button
                key={s.state}
                size="sm"
                variant={active ? "gold" : "ghost"}
                disabled={busy}
                onClick={() => setPodium(s.state)}
              >
                {s.label}
              </Button>
            );
          })}
        </div>

        {/* Top-3 preview so the host knows who's about to appear */}
        <div className="mt-4 space-y-2">
          {podium.length === 0 ? (
            <p className="text-sm italic text-sage/70">
              No completed games yet — nobody to crown.
            </p>
          ) : (
            podium.map((seat) => (
              <div
                key={seat.rank + seat.name}
                className="frame-gilt flex items-center gap-3 rounded-card bg-panel/50 px-3 py-2"
              >
                <span className="flex w-8 justify-center">
                  <Medal rank={seat.rank} />
                </span>
                <span
                  className="size-3.5 shrink-0 rounded-full ring-1 ring-cream/20"
                  style={{ backgroundColor: seat.color }}
                />
                <span className="min-w-0 flex-1 truncate font-body text-cream">{seat.name}</span>
                {seat.isTied && <Badge tone="amber">Tie</Badge>}
                <span className="nums text-lg text-gilt">{seat.totalPoints}</span>
              </div>
            ))
          )}
        </div>
      </Panel>

      {/* ── Finish & lock ───────────────────────────────────────────── */}
      <Panel tone="deep">
        <SectionHeading
          eyebrow="Closing"
          title="Finish & Lock"
          trailing={
            <span className="nums text-sm text-sage/70">
              {gamesComplete}/{gamesTotal} games done
            </span>
          }
        />
        {isLocked ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-md text-sm text-cream">
              <Badge tone="cranberry" className="mr-2">
                Locked
              </Badge>
              Scores are frozen and the TV is on the drumroll screen. Use{" "}
              <span className="text-gold-soft">Podium Reveal</span> above to unveil 3rd → 2nd
              → 1st.
            </p>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => {
                if (confirm("Reopen this edition for editing? The TV returns to the scoreboard.")) {
                  finish(false);
                }
              }}
            >
              Reopen Edition
            </Button>
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-md text-sm text-sage">
              {gamesComplete < gamesTotal
                ? `${gamesTotal - gamesComplete} game${gamesTotal - gamesComplete === 1 ? "" : "s"} still open. You can finish now — only completed games count — or wrap them up first.`
                : "Every game is in. Lock it to freeze the scores — the TV moves to a drumroll so you can run the podium reveal."}
            </p>
            <Button
              variant="cranberry"
              disabled={busy || gamesComplete === 0}
              onClick={() => {
                if (confirm("Finish & lock the event? This freezes all scores and shows the final results.")) {
                  finish(true);
                }
              }}
            >
              Finish &amp; Lock Results
            </Button>
          </div>
        )}
      </Panel>
    </div>
  );
}
