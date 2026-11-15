import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const BASE =
  "rounded-card border border-gilt bg-forest-deep/60 px-3 font-body text-cream outline-none focus:border-gilt-strong placeholder:text-cream/30";

/** The shared field style. `tall` is the 44px version used on public/mobile forms.
 *  Exported as a class string too, for elements that aren't an <input>/<select>
 *  (a <textarea>, say). */
export function inputClass(tall = false, className?: string): string {
  return cn(tall ? "h-11" : "h-10", BASE, className);
}

export function Input({
  tall,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { tall?: boolean }) {
  return <input className={inputClass(tall, className)} {...props} />;
}

export function Select({
  tall,
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { tall?: boolean }) {
  return <select className={inputClass(tall, className)} {...props} />;
}
