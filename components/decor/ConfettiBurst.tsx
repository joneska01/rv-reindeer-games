import { cn } from "@/lib/cn";
import { seeded } from "./seeded";
import { CONFETTI_COLORS } from "./Confetti";

const round = (n: number) => Number(n.toFixed(2));

/**
 * A one-shot confetti burst: pieces launch up and out in a fan, slow at the top,
 * then fall. Plays once (the pieces end invisible), so mount it at the moment of
 * the celebration. `className` positions the burst's origin (e.g. "left-1/2 top-1/2").
 *
 * Only ever rendered after a live change, never in server HTML, and its numbers
 * are rounded, so there is nothing to mismatch on hydration. Removed entirely
 * under reduced-motion.
 */
export function ConfettiBurst({ count = 56, className }: { count?: number; className?: string }) {
  const pieces = Array.from({ length: count }, (_, i) => {
    // Mostly upward, fanned about 150° wide.
    const angle = (-90 + (seeded(i, 1) - 0.5) * 150) * (Math.PI / 180);
    const power = 0.45 + seeded(i, 2) * 0.55;
    const round_ = seeded(i, 8) > 0.6;
    const size = 6 + seeded(i, 3) * 8;
    return {
      bx: round(Math.cos(angle) * power * 46),
      by: round(Math.sin(angle) * power * 55),
      w: round(size),
      h: round(size * (round_ ? 1 : 0.5)),
      spin: Math.round(360 + seeded(i, 4) * 720),
      delay: round(seeded(i, 5) * 0.2),
      duration: round(3.2 + seeded(i, 6) * 1.8),
      color: CONFETTI_COLORS[Math.floor(seeded(i, 7) * CONFETTI_COLORS.length)],
      round: round_,
    };
  });

  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute z-50 size-0 motion-reduce:hidden", className)}
    >
      {pieces.map((p, i) => (
        <span
          key={i}
          className={cn("absolute left-0 top-0 opacity-0", p.round ? "rounded-full" : "rounded-[1px]")}
          style={{
            width: `${p.w}px`,
            height: `${p.h}px`,
            backgroundColor: p.color,
            animation: `rv-burst ${p.duration}s linear ${p.delay}s 1 both`,
            ["--bx" as string]: `${p.bx}vw`,
            ["--by" as string]: `${p.by}vh`,
            ["--spin" as string]: `${p.spin}deg`,
          }}
        />
      ))}
    </div>
  );
}
