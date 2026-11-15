import { cn } from "@/lib/cn";

// Full class names so Tailwind can see them.
const SIZES = {
  "2.5": "size-2.5",
  "3.5": "size-3.5",
  "4": "size-4",
  "5": "size-5",
} as const;

/** A team's color chip. Always `shrink-0` so a long team name can't squash it. */
export function TeamDot({
  color,
  size = "3.5",
  className,
}: {
  color: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      className={cn("shrink-0 rounded-full ring-1 ring-cream/20", SIZES[size], className)}
      style={{ backgroundColor: color }}
    />
  );
}
