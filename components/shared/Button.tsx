import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "gold" | "cranberry" | "ghost" | "naughty";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  gold: "bg-gradient-to-b from-gold-soft to-gold text-forest-deep border-transparent hover:brightness-110 shadow-glow-gold",
  cranberry:
    "bg-cranberry text-cream border-transparent hover:bg-cranberry-bright shadow-glow-cranberry",
  ghost: "bg-transparent text-gold-soft border-gilt hover:border-gilt-strong hover:bg-panel/50",
  naughty: "bg-transparent text-cranberry-bright border-cranberry/50 hover:bg-cranberry/15",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-[0.95rem]",
  lg: "h-12 px-7 text-base",
};

/** Shared class string — also usable on <Link>, <a>, etc. */
export function buttonClass(
  variant: ButtonVariant = "gold",
  size: ButtonSize = "md",
  className?: string,
): string {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-pill border font-display uppercase tracking-[0.12em]",
    "transition-[filter,background-color,border-color,transform] duration-200 active:translate-y-px",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-forest-deep",
    "disabled:cursor-not-allowed disabled:opacity-40 disabled:active:translate-y-0",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export function Button({
  variant = "gold",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}
