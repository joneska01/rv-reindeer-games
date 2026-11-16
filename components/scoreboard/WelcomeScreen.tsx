"use client";

import Link from "next/link";

/** Shown on the TV for an edition that hasn't kicked off yet (no game has gone
 *  live). The host setting any game active flips the board to the live view. */
export function WelcomeScreen({ year }: { year?: number }) {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden text-center">
      <Link
        href="/"
        className="absolute left-0 top-0 font-display text-sm uppercase tracking-[0.18em] text-cream/40 transition-colors hover:text-gold-soft"
      >
        ← Home
      </Link>

      {/* Santa's team flies across the sky on a loop (reindeer lead, sleigh trails) */}
      <div className="pointer-events-none absolute inset-x-0 top-[14%]">
        <div className="animate-sleigh inline-flex items-end gap-1 whitespace-nowrap text-4xl">
          <span className="animate-bob" style={{ animationDelay: "0s" }}>🦌</span>
          <span className="animate-bob" style={{ animationDelay: "0.15s" }}>🦌</span>
          <span className="animate-bob" style={{ animationDelay: "0.3s" }}>🦌</span>
          <span className="animate-bob" style={{ animationDelay: "0.45s" }}>🦌</span>
          <span className="animate-bob text-5xl" style={{ animationDelay: "0.6s" }}>🛷</span>
        </div>
      </div>

      <p className="eyebrow animate-rise mb-4">Welcome to the</p>
      <h1
        className="text-gilt sign-glow animate-rise text-7xl leading-none sm:text-8xl"
        style={{ animationDelay: "80ms" }}
      >
        {year} Edition
      </h1>
      <p
        className="text-gilt animate-rise mt-3 font-display text-3xl sm:text-5xl"
        style={{ animationDelay: "160ms" }}
      >
        of the Reindeer Games
      </p>

      {/* Prancing herd */}
      <div className="animate-rise mt-12 flex gap-7 text-6xl" style={{ animationDelay: "260ms" }}>
        <span className="animate-bob" style={{ animationDelay: "0s" }}>🦌</span>
        <span className="animate-bob" style={{ animationDelay: "0.3s" }}>🦌</span>
        <span className="animate-bob" style={{ animationDelay: "0.6s" }}>🦌</span>
        <span className="animate-bob" style={{ animationDelay: "0.9s" }}>🦌</span>
      </div>

      <p
        className="animate-rise mt-10 font-body text-xl text-sage"
        style={{ animationDelay: "360ms" }}
      >
        Let the games begin…
      </p>
    </div>
  );
}
