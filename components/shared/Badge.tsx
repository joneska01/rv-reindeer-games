import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone =
  | "gold"
  | "cranberry"
  | "sage"
  | "amber"
  | "naughty"
  | "neutral";

const TONES: Record<BadgeTone, string> = {
  gold: "border-gilt-strong bg-gold/12 text-gold-soft",
  cranberry: "border-cranberry/50 bg-cranberry/15 text-cream",
  sage: "border-sage/40 bg-sage/10 text-sage",
  amber: "border-amber/60 bg-amber/15 text-amber",
  naughty: "border-cherry/60 bg-cherry/15 text-cherry",
  neutral: "border-gilt bg-forest-deep/40 text-cream/80",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-0.5",
        "font-display text-[0.68rem] uppercase tracking-[0.18em]",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
