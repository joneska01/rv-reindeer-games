import { cn } from "@/lib/cn";

/**
 * Deterministic pseudo-random in [0,1). Rounded to 6 decimals so the tiny
 * last-digit differences between Node's and the browser's `Math.sin` can't
 * cause a hydration mismatch — every downstream +,−,× is then bit-identical.
 */
function seeded(i: number, salt: number): number {
  const x = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return Math.round((x - Math.floor(x)) * 1e6) / 1e6;
}

/**
 * Subtle CSS snowfall. Flakes are seeded by index (no randomness at runtime, so
 * no hydration mismatch) and the whole layer is removed under reduced-motion.
 */
export function Snowfall({ count = 40, className }: { count?: number; className?: string }) {
  const flakes = Array.from({ length: count }, (_, i) => ({
    left: seeded(i, 1) * 100,
    size: 1.5 + seeded(i, 2) * 3,
    duration: 9 + seeded(i, 3) * 12,
    delay: -seeded(i, 4) * 20,
    opacity: 0.25 + seeded(i, 5) * 0.5,
    drift: -4 + seeded(i, 6) * 8,
  }));

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed inset-0 z-0 overflow-hidden motion-reduce:hidden",
        className,
      )}
    >
      {flakes.map((f, i) => (
        <span
          key={i}
          className="absolute top-0 rounded-full bg-cream opacity-0"
          style={{
            left: `${f.left}%`,
            width: `${f.size}px`,
            height: `${f.size}px`,
            boxShadow: "0 0 4px rgba(245,237,214,0.6)",
            animation: `rv-fall ${f.duration}s linear ${f.delay}s infinite`,
            ["--flake-opacity" as string]: f.opacity,
            ["--flake-drift" as string]: `${f.drift}vw`,
          }}
        />
      ))}
    </div>
  );
}
