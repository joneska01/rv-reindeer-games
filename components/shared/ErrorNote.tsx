import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** The cranberry error banner shown above forms and consoles. `compact` is the
 *  tighter padding the login form uses; `className` adds spacing (mt-3, mb-4…). */
export function ErrorNote({
  children,
  compact = false,
  className,
}: {
  children: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "rounded-card border border-cranberry/50 bg-cranberry/15 text-sm text-cream",
        compact ? "px-3 py-2" : "px-4 py-2.5",
        className,
      )}
    >
      {children}
    </p>
  );
}
