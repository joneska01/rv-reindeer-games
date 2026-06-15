"use client";

import Link from "next/link";
import { IDLE_LINES, pickLine } from "@/lib/copy";

export function IdleScreen({ seed }: { seed: number }) {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center text-center">
      <Link
        href="/"
        className="absolute left-0 top-0 font-display text-sm uppercase tracking-[0.18em] text-cream/40 transition-colors hover:text-gold-soft"
      >
        ← Home
      </Link>
      <div className="animate-glow mb-8 flex h-24 w-24 items-center justify-center rounded-full border border-gilt-strong bg-forest-deep/60">
        <span className="text-gilt font-display text-3xl tracking-[0.1em]">RV</span>
      </div>
      <p className="eyebrow mb-3">Reindeer Games</p>
      <h1 className="text-gilt mb-5 text-4xl sm:text-6xl">The Stage Is Set</h1>
      <p className="max-w-md font-body text-lg text-sage">{pickLine(IDLE_LINES, seed)}</p>
    </div>
  );
}
