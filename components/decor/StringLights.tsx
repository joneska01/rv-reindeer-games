import { cn } from "@/lib/cn";

const BULB_COLORS = ["#d4283c", "#e8c97a", "#1a8b3a", "#d4af37", "#b01e2e"];

/**
 * A swagged garland of café-style bulbs for headers. SVG with a draped wire and
 * staggered twinkle. Decorative only.
 */
export function StringLights({
  bulbs = 14,
  className,
}: {
  bulbs?: number;
  className?: string;
}) {
  const width = 1200;
  const sag = 26;
  const points = Array.from({ length: bulbs }, (_, i) => {
    const t = bulbs === 1 ? 0.5 : i / (bulbs - 1);
    const x = t * width;
    // gentle catenary-ish droop, repeated swags
    const y = 14 + Math.abs(Math.sin(t * Math.PI * 3)) * sag;
    return { x, y, color: BULB_COLORS[i % BULB_COLORS.length], delay: (i % 5) * 0.4 };
  });

  const wire = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${width} 60`}
      preserveAspectRatio="none"
      className={cn("h-12 w-full", className)}
    >
      <path d={wire} fill="none" stroke="var(--color-gilt-strong)" strokeWidth={1.5} />
      {points.map((p, i) => (
        <g key={i} style={{ transformOrigin: `${p.x}px ${p.y}px` }}>
          <line x1={p.x} y1={p.y - 2} x2={p.x} y2={p.y + 3} stroke="var(--color-gilt-strong)" strokeWidth={1} />
          <circle
            cx={p.x}
            cy={p.y + 8}
            r={5}
            fill={p.color}
            style={{
              filter: `drop-shadow(0 0 6px ${p.color})`,
              animation: `rv-twinkle 2.8s ease-in-out ${p.delay}s infinite`,
            }}
          />
        </g>
      ))}
    </svg>
  );
}
