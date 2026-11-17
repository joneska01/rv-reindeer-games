import { cn } from "@/lib/cn";
import { seeded } from "./seeded";

// Palette tokens, not hex: confetti follows the theme.
export const CONFETTI_COLORS = [
  "var(--color-gold)",
  "var(--color-cherry)",
  "var(--color-mint)",
  "var(--color-cream)",
  "var(--color-gold-soft)",
];

/**
 * A celebratory confetti layer for the podium finale. Pieces are seeded by
 * index (no runtime randomness → no hydration mismatch) and the whole layer
 * disappears under reduced-motion.
 */
export function Confetti({ count = 70, className }: { count?: number; className?: string }) {
  const pieces = Array.from({ length: count }, (_, i) => ({
    left: seeded(i, 1) * 100,
    size: 5 + seeded(i, 2) * 7,
    duration: 4.5 + seeded(i, 3) * 4,
    delay: -seeded(i, 4) * 6,
    spin: 360 + seeded(i, 5) * 540,
    color: CONFETTI_COLORS[Math.floor(seeded(i, 6) * CONFETTI_COLORS.length)],
    round: seeded(i, 7) > 0.6,
  }));

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed inset-0 z-0 overflow-hidden motion-reduce:hidden",
        className,
      )}
    >
      {pieces.map((p, i) => (
        <span
          key={i}
          className={cn("absolute top-0", p.round ? "rounded-full" : "rounded-[1px]")}
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size * (p.round ? 1 : 0.5)}px`,
            backgroundColor: p.color,
            // @ts-expect-error custom property for the keyframe
            "--confetti-spin": `${p.spin}deg`,
            animation: `rv-confetti ${p.duration}s linear ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
