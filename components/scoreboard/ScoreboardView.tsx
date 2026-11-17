"use client";

import Link from "next/link";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { Snowfall } from "@/components/decor/Snowfall";
import { Confetti } from "@/components/decor/Confetti";
import { StringLights } from "@/components/decor/StringLights";
import { cn } from "@/lib/cn";
import { Panel } from "@/components/shared/Panel";
import { Badge } from "@/components/shared/Badge";
import { StandingsBoard } from "./StandingsBoard";
import { NowPlaying } from "./NowPlaying";
import { PodiumStage } from "./PodiumStage";
import { FinalResults } from "./FinalResults";
import { IdleScreen } from "./IdleScreen";
import { WelcomeScreen } from "./WelcomeScreen";
import { usePolling } from "@/lib/hooks/usePolling";
import { useMoments } from "@/lib/hooks/useMoments";
import { MomentStage } from "./MomentStage";
import type { ScoreboardPayload } from "@/lib/scoreboard";

export function ScoreboardView({
  initial,
  pollMs,
  voteUrl,
}: {
  initial: ScoreboardPayload;
  pollMs: number;
  /** Address the costume-vote QR points at (the host this TV loaded); null if unknown. */
  voteUrl: string | null;
}) {
  // Keeps the last good payload on failure so a blip never blanks the TV.
  const { data, tick } = usePolling<ScoreboardPayload>("/api/scoreboard", pollMs, initial);
  // The "big moment" to play right now (a new game, a winner, a demerit), if any.
  const moment = useMoments(data);

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

      {/* Scoreboard, podium and final results fade into each other rather than cutting. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={mode}
          className="flex flex-1 flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45 }}
        >
          {mode === "podium" ? (
            <PodiumStage teams={teams} standings={standings} podiumState={data.podiumState ?? "hidden"} />
          ) : mode === "final_results" ? (
            <FinalResults teams={teams} standings={standings} year={data.year} />
          ) : (
            <div className="grid flex-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
              <Panel className="flex flex-col">
                <StandingsBoard teams={teams} standings={standings} title="Overall Standings" />
              </Panel>
              {/* While ballots are open the panel gets a neon tube: the one loud thing on screen. */}
              <Panel
                tone="deep"
                className={cn("flex flex-col", data.activeGame?.votingOpen && "frame-neon")}
              >
                <NowPlaying
                  teams={teams}
                  game={data.activeGame ?? null}
                  seed={tick}
                  voteUrl={voteUrl}
                />
              </Panel>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <MomentStage current={moment} teams={teams} />
    </Stage>
  );
}

function Stage({ children, confetti = false }: { children: React.ReactNode; confetti?: boolean }) {
  return (
    // Margins are a share of the screen (4% sides, 3.5% bottom) because older TVs
    // crop the picture edge; the top clears the string lights.
    <main className="relative flex min-h-dvh flex-col px-[4vw] pb-[3.5vh] pt-14">
      <Snowfall count={28} />
      {/* A light, steady fall. The big entrance is the one-shot ConfettiBurst on the podium. */}
      {confetti && <Confetti count={28} />}
      <StringLights className="pointer-events-none absolute inset-x-0 top-0 opacity-90" />
      {/* "user": anyone who asked their device for less motion gets plain swaps, not slides. */}
      <MotionConfig reducedMotion="user">
        <div className="relative z-10 flex flex-1 flex-col">{children}</div>
      </MotionConfig>
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
