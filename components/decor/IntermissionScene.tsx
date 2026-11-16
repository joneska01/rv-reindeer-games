import { cn } from "@/lib/cn";
import { StringLights } from "./StringLights";

// Festive baubles that gently swing from the garland (staggered).
const ORNAMENTS = [
  { color: "var(--color-cherry)", delay: "0s", wire: "h-10" },
  { color: "var(--color-gold)", delay: "0.5s", wire: "h-16" },
  { color: "var(--color-mint)", delay: "1s", wire: "h-12" },
  { color: "var(--color-cream)", delay: "0.25s", wire: "h-14" },
];

/** Christmas filler for empty space — a twinkling garland with swinging ornaments. */
export function IntermissionScene() {
  return (
    <div aria-hidden className="pointer-events-none mt-10 w-full max-w-sm">
      <StringLights bulbs={12} />
      <div className="-mt-1 flex justify-center gap-9">
        {ORNAMENTS.map((o, i) => (
          <div
            key={i}
            className="animate-sway flex flex-col items-center"
            style={{ animationDelay: o.delay }}
          >
            <div className={cn("w-px bg-gilt-strong/60", o.wire)} />
            <div
              className="size-6 rounded-full ring-1 ring-cream/30"
              style={{ backgroundColor: o.color, boxShadow: `0 0 12px ${o.color}` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
