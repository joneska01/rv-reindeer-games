import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Engraved eyebrow + gilded title. The house's section masthead. */
export function SectionHeading({
  eyebrow,
  title,
  trailing,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <div>
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h2 className="text-gilt text-2xl leading-tight sm:text-3xl">{title}</h2>
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </div>
  );
}
