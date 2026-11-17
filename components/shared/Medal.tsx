import { cn } from "@/lib/cn";

export const MEDALS: Record<number, { glyph: string; ring: string }> = {
  1: { glyph: "🥇", ring: "text-gold" },
  2: { glyph: "🥈", ring: "text-silver" },
  3: { glyph: "🥉", ring: "text-bronze" },
};

/**
 * Rank indicator. Top three get a medal glyph; everyone else gets a gilt
 * numeral in tabular figures so columns stay aligned.
 */
export function Medal({ rank, className }: { rank: number; className?: string }) {
  const medal = MEDALS[rank];
  if (medal) {
    return (
      <span className={cn("text-2xl leading-none", className)} aria-label={`Rank ${rank}`}>
        {medal.glyph}
      </span>
    );
  }
  return (
    <span
      className={cn("nums text-lg font-medium text-cream/55", className)}
      aria-label={`Rank ${rank}`}
    >
      {rank}
    </span>
  );
}

export function rankColor(rank: number): string {
  return MEDALS[rank]?.ring ?? "text-cream";
}
