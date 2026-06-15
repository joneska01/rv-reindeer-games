"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Snowfall } from "@/components/decor/Snowfall";
import { Confetti } from "@/components/decor/Confetti";
import { Panel } from "@/components/shared/Panel";
import { Badge } from "@/components/shared/Badge";
import { StandingsBoard } from "./StandingsBoard";
import { NowPlaying } from "./NowPlaying";
import { PodiumStage } from "./PodiumStage";
import { FinalResults } from "./FinalResults";
import { IdleScreen } from "./IdleScreen";
import { WelcomeScreen } from "./WelcomeScreen";
import type { ScoreboardPayload } from "@/lib/scoreboard";

export function ScoreboardView({
  initial,
  pollMs,
}: {
  initial: ScoreboardPayload;
  pollMs: number;
}) {
  const [data, setData] = useState<ScoreboardPayload>(initial);
  const [tick, setTick] = useState(0);

  // Poll the public API on an interval; keep the last good payload on failure
  // so a blip never blanks the TV.
  useEffect(() => {
    let alive = true;
    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/scoreboard", { cache: "no-store" });
        if (!res.ok) return;
        const next = (await res.json()) as ScoreboardPayload;
        if (alive) {
          setData(next);
          setTick((t) => t + 1);
        }
      } catch {
        /* keep showing the last good data */
      }
    }, pollMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [pollMs]);

  if (!data.active) {
    return (
      <Stage>
        <IdleScreen seed={tick} />
      </Stage>
    );
  }

  // Active edition, but no game has gone live yet → welcome screen.
  if (!data.hasStarted) {
    return (
      <Stage>
        <WelcomeScreen year={data.year} />
      </Stage>
    );
  }

  const teams = data.teams ?? [];
  const standings = data.standings ?? [];
  const mode = data.displayMode ?? "scoreboard";
  const celebrate =
    mode === "final_results" ||
    (mode === "podium" && (data.podiumState === "show_first" || data.podiumState === "show_all"));

  return (
    <Stage confetti={celebrate}>
      <Header
        year={data.year}
        completed={data.completedGames ?? 0}
        total={data.totalGames ?? 0}
        isTest={data.isTest}
      />

      <div className="flex flex-1 flex-col">
        {mode === "podium" ? (
          <PodiumStage teams={teams} standings={standings} podiumState={data.podiumState ?? "hidden"} />
        ) : mode === "final_results" ? (
          <FinalResults teams={teams} standings={standings} year={data.year} />
        ) : (
          <div className="grid flex-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
            <Panel className="flex flex-col">
              <StandingsBoard teams={teams} standings={standings} title="Overall Standings" />
            </Panel>
            <Panel tone="deep" className="flex flex-col">
              <NowPlaying teams={teams} game={data.activeGame ?? null} seed={tick} />
            </Panel>
          </div>
        )}
      </div>
    </Stage>
  );
}

function Stage({ children, confetti = false }: { children: React.ReactNode; confetti?: boolean }) {
  return (
    <main className="relative flex min-h-dvh flex-col px-6 py-6 sm:px-10 sm:py-8">
      <Snowfall count={28} />
      {confetti && <Confetti count={80} />}
      <div className="relative z-10 flex flex-1 flex-col">{children}</div>
    </main>
  );
}

function Header({
  year,
  completed,
  total,
  isTest,
}: {
  year?: number;
  completed: number;
  total: number;
  isTest?: boolean;
}) {
  return (
    <header className="mb-6 flex items-center justify-between gap-4">
      <Link
        href="/"
        className="group flex items-center gap-3 opacity-80 transition-opacity hover:opacity-100"
        title="Back to home"
      >
        <span className="font-display text-lg text-cream/40 transition-colors group-hover:text-gold-soft">
          ←
        </span>
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-gilt-strong bg-forest-deep/60">
          <span className="text-gilt font-display text-base tracking-[0.1em]">RV</span>
        </div>
        <div>
          <p className="eyebrow">Reindeer Games</p>
          <p className="text-gilt font-display text-xl leading-none">{year}</p>
        </div>
      </Link>
      <div className="flex items-center gap-2">
        {isTest && <Badge tone="amber">Test</Badge>}
        <Badge tone="gold">
          {completed}/{total} games
        </Badge>
      </div>
    </header>
  );
}
