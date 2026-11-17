"use client";

import { useEffect } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";

const toWhole = (n: number) => String(Math.round(n));

/**
 * A number that counts up (or down) to its new value instead of snapping.
 * It shows the true value on first render and only animates *changes*, so a
 * refreshed TV doesn't count up from zero. Under reduced-motion it just swaps.
 */
export function AnimatedNumber({
  value,
  format = toWhole,
  className,
}: {
  value: number;
  /** How to print the in-between values (defaults to whole numbers). */
  format?: (n: number) => string;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const motionValue = useMotionValue(value);
  const text = useTransform(motionValue, format);

  useEffect(() => {
    if (reduceMotion) {
      motionValue.set(value);
      return;
    }
    const controls = animate(motionValue, value, { duration: 0.9, ease: "easeOut" });
    return () => controls.stop();
  }, [value, reduceMotion, motionValue]);

  return <motion.span className={className}>{text}</motion.span>;
}
