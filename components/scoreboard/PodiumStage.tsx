"use client";

import { cn } from "@/lib/cn";
import type { SbTeam, SbStanding } from "@/lib/scoreboard";

type PodiumState = "hidden" | "show_third" | "show_second" | "show_first" | "show_all";

const REVEALED: Record<PodiumState, number[]> = {
  hidden: [],
  show_third: [3],
  show_second: [3, 2],
  show_first: [3, 2, 1],
  show_all: [3, 2, 1],
};

// Visual ordering left→right and relative plinth height per place.
const SEATS = [
  { place: 2, height: "h-40", glyph: "🥈", accent: "text-silver" },
  { place: 1, height: "h-56", glyph: "🥇", accent: "text-gold" },
  { place: 3, height: "h-32", glyph: "🥉", accent: "text-bronze" },
];

export function PodiumStage({
  teams,
  standings,
  podiumState,
}: {
  teams: SbTeam[];
  standings: SbStanding[];
  podiumState: PodiumState;
}) {
  const team = (id: string) => teams.find((t) => t.id === id);
  const revealed = REVEALED[podiumState];
  const namesAt = (place: number) =>
    standings.filter((s) => s.rank === place).map((s) => ({ s, t: team(s.teamId) }));

  return (
    <div className="flex h-full flex-col items-center justify-end">
      <p className="eyebrow mb-2">The Podium</p>
      <h2 className="text-gilt mb-10 text-center text-4xl">
        {podiumState === "hidden" ? "And the winners are…" : "Reindeer Games Champions"}
      </h2>

      <div className="flex w-full max-w-3xl items-end justify-center gap-4">
        {SEATS.map(({ place, height, glyph, accent }) => {
          const isUp = revealed.includes(place);
          const seats = namesAt(place);
          const champ = place === 1;
          return (
            <div key={place} className="flex w-1/3 flex-col items-center">
              {/* Name card rises in on reveal */}
              <div
                className={cn(
                  "mb-3 text-center transition-all duration-500",
                  isUp ? "animate-pop opacity-100" : "translate-y-3 opacity-0",
                )}
              >
                <div className={cn("text-4xl", accent)}>{glyph}</div>
                {seats.length > 0 ? (
                  seats.map(({ s, t }) => (
                    <div key={s.teamId} className="mt-1">
                      <div className="flex items-center justify-center gap-2">
                        <span
                          className="size-3 rounded-full ring-1 ring-cream/20"
                          style={{ backgroundColor: t?.color ?? "#888" }}
                        />
                        <span className={cn("font-body text-cream", champ ? "text-xl" : "text-base")}>
                          {t?.name ?? "—"}
                        </span>
                      </div>
                      <div className="nums text-gilt">{s.totalPoints} pts</div>
                    </div>
                  ))
                ) : (
                  <div className="mt-1 text-sm italic text-sage/60">—</div>
                )}
              </div>

              {/* Plinth */}
              <div
                className={cn(
                  "flex w-full items-start justify-center rounded-t-card border border-gilt bg-gradient-to-b pt-3 transition-all duration-500",
                  height,
                  isUp ? "opacity-100" : "opacity-30",
                  champ
                    ? "from-gold/25 to-forest-deep/30 animate-glow"
                    : "from-panel/70 to-forest-deep/30",
                )}
              >
                <span className={cn("nums text-2xl font-medium", accent)}>{place}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
