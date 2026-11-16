"use client";

import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/cn";

/**
 * A line of copy that fades out and the next fades in, instead of snapping.
 * `reserve` is a min-height class sized for the longest line, so the block
 * around it doesn't jump when a one-line saying follows a two-line one.
 */
export function FadingLine({
  text,
  className,
  reserve,
}: {
  text: string;
  className?: string;
  reserve?: string;
}) {
  return (
    <div className={cn("flex items-center justify-center", reserve)}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={text}
          className={className}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.4 }}
        >
          {text}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
