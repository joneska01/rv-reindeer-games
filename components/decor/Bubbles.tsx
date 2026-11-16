import { cn } from "@/lib/cn";
import { seeded } from "./seeded";

/**
 * Champagne bubbles rising through whatever panel it sits in. The parent needs
 * `relative overflow-hidden` (the layer fills it and clips the bubbles at the
 * top). Seeded like `Snowfall`, and removed entirely under reduced-motion.
 */
export function Bubbles({ count = 24, className }: { count?: number; className?: string }) {
  const bubbles = Array.from({ length: count }, (_, i) => ({
    left: seeded(i, 1) * 100,
    size: 6 + seeded(i, 2) * 12,
    duration: 8 + seeded(i, 3) * 8,
    delay: -seeded(i, 4) * 16,
    opacity: 0.55 + seeded(i, 5) * 0.4,
    sway: -14 + seeded(i, 6) * 28,
  }));

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 z-0 overflow-hidden motion-reduce:hidden",
        className,
      )}
    >
      {bubbles.map((b, i) => (
        <span
          key={i}
          className="absolute bottom-0 rounded-full border border-gold-soft/80 bg-gold-soft/20 opacity-0"
          style={{
            left: `${b.left}%`,
            width: `${b.size}px`,
            height: `${b.size}px`,
            animation: `rv-bubble ${b.duration}s linear ${b.delay}s infinite`,
            ["--bubble-opacity" as string]: b.opacity,
            ["--bubble-sway" as string]: `${b.sway}px`,
          }}
        />
      ))}
    </div>
  );
}
