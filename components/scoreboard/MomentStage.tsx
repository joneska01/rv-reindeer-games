"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/cn";
import { DEMERIT_LINES, MOMENT_COPY, upNextRule } from "@/lib/copy";
import { fmtScore } from "@/lib/format";
import type { Moment } from "@/lib/moments";
import type { QueuedMoment } from "@/lib/hooks/useMoments";
import type { TeamVM } from "@/lib/view-models";
import { ConfettiBurst } from "@/components/decor/ConfettiBurst";
import { MEDALS } from "@/components/shared/Medal";
import { TeamDot } from "@/components/shared/TeamDot";

type Of<K extends Moment["kind"]> = Extract<Moment, { kind: K }>;

/**
 * Draws whichever "big moment" is at the front of the queue. One at a time:
 * the old one fades out before the next fades in.
 */
export function MomentStage({
  current,
  teams,
}: {
  current: QueuedMoment | null;
  teams: TeamVM[];
}) {
  return (
    <AnimatePresence mode="wait">
      {current?.moment.kind === "upNext" && (
        <Takeover key={current.id}>
          <UpNext moment={current.moment} />
        </Takeover>
      )}
      {current?.moment.kind === "winner" && (
        <Takeover key={current.id}>
          <Winner moment={current.moment} teams={teams} />
        </Takeover>
      )}
      {current?.moment.kind === "demerit" && (
        <DemeritToast key={current.id} id={current.id} moment={current.moment} teams={teams} />
      )}
    </AnimatePresence>
  );
}

/** Full-screen card over a dark scrim. (Solid scrim, no blur: blur is costly on an old TV.) */
function Takeover({ children }: { children: ReactNode }) {
  return (
    <motion.div
      role="status"
      className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-forest-deep/95 px-[6vw] text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45 }}
    >
      {children}
    </motion.div>
  );
}

function UpNext({ moment }: { moment: Of<"upNext"> }) {
  return (
    <>
      <p className="eyebrow neon-cherry animate-neon text-2xl tracking-[0.4em]">
        {MOMENT_COPY.upNext}
      </p>
      <h2 className="text-gilt sign-glow animate-pop mt-6 text-7xl leading-tight">{moment.name}</h2>
      <p
        className="animate-rise mt-8 max-w-3xl font-body text-3xl text-sage"
        style={{ animationDelay: "500ms" }}
      >
        {upNextRule(moment)}
      </p>
    </>
  );
}

/** Results climb from the bottom of the podium to the top: 3rd, then 2nd, then the winner. */
function Winner({ moment, teams }: { moment: Of<"winner">; teams: TeamVM[] }) {
  const voting = moment.scoreSource === "voting";
  const unit = voting ? "pts" : moment.scoreUnit;
  return (
    <>
      <ConfettiBurst count={48} className="left-1/2 top-[36%]" />
      <p className="eyebrow text-xl tracking-[0.4em]">
        {voting ? MOMENT_COPY.votesIn : MOMENT_COPY.winner}
      </p>
      <h2 className="text-gilt sign-glow mt-3 text-6xl leading-tight">{moment.name}</h2>

      <ol className="mt-10 w-full max-w-3xl space-y-3">
        {moment.podium.map((r) => {
          const team = teams.find((t) => t.id === r.teamId);
          const champ = r.place === 1;
          return (
            <li
              key={r.teamId}
              className={cn(
                "frame-gilt animate-pop flex items-center gap-5 rounded-card px-6",
                champ ? "bg-gold/15 py-5 ring-1 ring-gold/40" : "bg-panel/70 py-3",
              )}
              style={{ animationDelay: `${(3 - Math.min(r.place, 3)) * 700 + 300}ms` }}
            >
              <span className="w-14 text-5xl leading-none" aria-label={`Place ${r.place}`}>
                {MEDALS[r.place]?.glyph ?? r.place}
              </span>
              <TeamDot color={team?.color ?? "#888"} size="5" />
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-left font-body",
                  champ ? "text-gilt text-5xl" : "text-3xl text-cream",
                )}
              >
                {team?.name ?? "—"}
              </span>
              <span className={cn("nums shrink-0 text-gilt", champ ? "text-4xl" : "text-2xl")}>
                {fmtScore(r.combinedScore)}
                <span className="ml-2 text-lg text-sage/70">{unit}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </>
  );
}

/** A small neon-framed note near the bottom: the host just handed out a demerit. */
function DemeritToast({
  id,
  moment,
  teams,
}: {
  id: number;
  moment: Of<"demerit">;
  teams: TeamVM[];
}) {
  const team = teams.find((t) => t.id === moment.teamId);
  const line = DEMERIT_LINES[id % DEMERIT_LINES.length](team?.name ?? "Someone");
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[7vh] z-40 flex justify-center px-[6vw]">
      <motion.div
        role="status"
        className="frame-gilt frame-neon flex items-center gap-5 rounded-panel bg-forest-deep/95 px-9 py-5"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.4 }}
      >
        <TeamDot color={team?.color ?? "#888"} size="5" />
        <div className="text-left">
          <p className="eyebrow neon-cherry">{MOMENT_COPY.demerit}</p>
          <p className="mt-1 font-body text-2xl text-cream">{line}</p>
        </div>
        <span className="nums neon-cherry text-3xl">−{moment.count}</span>
      </motion.div>
    </div>
  );
}
