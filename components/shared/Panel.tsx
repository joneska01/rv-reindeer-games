import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Gilt-framed surface — the base container for nearly everything.
 * `tone` shifts the felt; `inset` is for nested sub-panels.
 */
export function Panel({
  children,
  className,
  tone = "panel",
  inset = false,
}: {
  children: ReactNode;
  className?: string;
  tone?: "panel" | "deep" | "soft";
  inset?: boolean;
}) {
  const bg =
    tone === "deep"
      ? "bg-forest-deep/70"
      : tone === "soft"
        ? "bg-panel-soft/60"
        : "bg-panel/70";
  return (
    <div
      className={cn(
        "frame-gilt rounded-panel backdrop-blur-sm",
        bg,
        inset ? "p-4" : "p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
