"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { ConfettiBurst } from "@/components/decor/ConfettiBurst";
import { StringLights } from "@/components/decor/StringLights";
import type { TeamVM, StandingVM } from "@/lib/view-models";
import { TeamDot } from "@/components/shared/TeamDot";

type PodiumState = "hidden" | "show_third" | "show_second" | "show_first" | "show_all";

const REVEALED: Record<PodiumState, number[]> = {
  hidden: [],
  show_third: [3],
  show_second: [3, 2],
  show_first: [3, 2, 1],
  show_all: [3, 2, 1],
};

// Visual ordering left→right: plinth height (rem, so it can animate), medal, accent, fill.
const SEATS = [
  { place: 2, height: "11rem", glyph: "🥈", accent: "text-silver", fill: "bg-silver/25" },
  { place: 1, height: "15rem", glyph: "🥇", accent: "text-gold", fill: "bg-gold/35" },
  { place: 3, height: "9rem", glyph: "🥉", accent: "text-bronze", fill: "bg-bronze/25" },
];

// A plinth that hasn't been revealed yet is a low stub; revealing it makes it rise.
const STUB = "3.5rem";

export function PodiumStage({
  teams,
  standings,
  podiumState,
}: {
  teams: TeamVM[];
  standings: StandingVM[];
  podiumState: PodiumState;
}) {
  const team = (id: string) => teams.find((t) => t.id === id);
  const revealed = REVEALED[podiumState];

  // Confetti goes off when first place is revealed *live*. A TV that loads (or is
  // refreshed) onto an already-revealed podium just shows it, with no replayed burst.
  const [mountedAt] = useState(podiumState);
  const isFirstShown = podiumState === "show_first" || podiumState === "show_all";
  const wasFirstShown = mountedAt === "show_first" || mountedAt === "show_all";
  const burst = isFirstShown && !wasFirstShown;
  const namesAt = (place: number) =>
    standings.filter((s) => s.rank === place).map((s) => ({ s, t: team(s.teamId) }));

  // Curtain down → drumroll/tallying screen (no spoilers).
  if (podiumState === "hidden") {
    return <TallyingScreen />;
  }

  return (
    <div className="flex h-full flex-col items-center justify-end">
      {burst && <ConfettiBurst count={70} className="left-1/2 top-[48%]" />}
      <p className="eyebrow mb-2 text-base">The Podium</p>
      <h2 className="text-gilt sign-glow mb-12 text-center text-5xl">Reindeer Games Champions</h2>

      <div className="flex w-full max-w-4xl items-end justify-center gap-6">
        {SEATS.map(({ place, height, glyph, accent, fill }) => {
          const isUp = revealed.includes(place);
          const seats = namesAt(place);
          const champ = place === 1;
          return (
            <div key={place} className="flex w-1/3 flex-col items-center">
              {/* Name card rises in on reveal */}
              <div
                className={cn(
                  "mb-4 text-center transition-all duration-500",
                  isUp ? "animate-pop opacity-100" : "translate-y-3 opacity-0",
                )}
              >
                <div className={cn(champ ? "text-8xl" : "text-7xl", accent)}>{glyph}</div>
                {seats.length > 0 ? (
                  seats.map(({ s, t }) => (
                    <div key={s.teamId} className="mt-2">
                      <div className="flex items-center justify-center gap-2.5">
                        <TeamDot color={t?.color ?? "#888"} size="5" />
                        <span
                          className={cn(
                            "font-body text-cream",
                            champ ? "text-4xl text-gilt" : "text-3xl",
                          )}
                        >
                          {t?.name ?? "—"}
                        </span>
                      </div>
                      <div className={cn("nums text-gilt", champ ? "text-2xl" : "text-xl")}>
                        {s.totalPoints} pts
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="mt-1 text-base italic text-sage/60">—</div>
                )}
              </div>

              {/* Plinth — solid color, champion keeps the pulsing glow */}
              <motion.div
                // Always starts as a stub, so a reveal makes the plinth rise (with a
                // touch of overshoot) rather than pop to full height.
                initial={{ height: STUB, opacity: 0.3 }}
                animate={{ height: isUp ? height : STUB, opacity: isUp ? 1 : 0.3 }}
                transition={{ type: "spring", stiffness: 120, damping: 16 }}
                className={cn(
                  "flex w-full items-start justify-center rounded-t-card border border-gilt pt-3",
                  fill,
                  champ && "animate-glow",
                )}
              >
                <span className={cn("nums text-4xl font-medium", accent)}>{place}</span>
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Drumroll screen shown after Finish & Lock, before the host reveals places. */
function TallyingScreen() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <StringLights bulbs={14} className="mb-12 max-w-2xl opacity-90" />

      <div className="animate-glow mb-8 flex h-28 w-28 items-center justify-center rounded-full border border-gilt-strong bg-forest-deep/60">
        <span className="text-5xl">🏆</span>
      </div>

      <p className="eyebrow mb-3 text-base">The Envelope, Please</p>
      <h2 className="text-gilt sign-glow mb-4 animate-pulse text-5xl sm:text-6xl">Tallying the Results…</h2>
      <p className="max-w-md font-body text-xl text-sage">
        The judges are deliberating (and topping off their cocoa).
      </p>

      <div className="mt-9 flex gap-2.5">
        <span className="size-3.5 animate-bounce rounded-full bg-gold [animation-delay:-0.3s]" />
        <span className="size-3.5 animate-bounce rounded-full bg-gold [animation-delay:-0.15s]" />
        <span className="size-3.5 animate-bounce rounded-full bg-gold" />
      </div>
    </div>
  );
}
