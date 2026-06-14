import { cn } from "@/lib/cn";

/**
 * Deterministic pseudo-random in [0,1). Rounded to 6 decimals so the tiny
 * last-digit differences between Node's and the browser's `Math.sin` can't
 * cause a hydration mismatch — every downstream +,−,× is then bit-identical.
 */
function seeded(i: number, salt: number): number {
  const x = Math.sin((i + 1) * 24.317 + salt * 13.7) * 91421.13;
  return Math.round((x - Math.floor(x)) * 1e6) / 1e6;
}

const COLORS = ["#D4AF37", "#C41E3A", "#1A8B3A", "#F5EDD6", "#B8860B"];

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
    color: COLORS[Math.floor(seeded(i, 6) * COLORS.length)],
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
