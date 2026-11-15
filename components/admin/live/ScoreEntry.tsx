"use client";

import { useState } from "react";
import { Panel } from "@/components/shared/Panel";
import { Badge } from "@/components/shared/Badge";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { cn } from "@/lib/cn";
import { useApi, jsonInit } from "@/lib/hooks/useApi";
import type { GameVM, TeamVM } from "@/lib/view-models";
import type { LiveScoreVM } from "./types";
import { TeamDot } from "@/components/shared/TeamDot";
import { ErrorNote } from "@/components/shared/ErrorNote";

const inputClass =
  "h-10 w-20 sm:w-24 rounded-card border border-gilt bg-forest-deep/60 px-3 text-right font-mono text-cream outline-none focus:border-gilt-strong placeholder:text-cream/25";

/** Does a typed value match what the server holds? ("5.0" equals "5"; blank equals blank.) */
function sameScore(typed: string, server: string): boolean {
  const t = typed.trim();
  if (t === server) return true;
  return t !== "" && server !== "" && Number(t) === Number(server);
}

export function ScoreEntry({
  game,
  teams,
  scores,
}: {
  game: GameVM;
  teams: TeamVM[];
  scores: LiveScoreVM[];
}) {
  const { call, error } = useApi();

  // server value lookup: `${teamId}:${round}` → string
  const serverVal = (teamId: string, round: number) => {
    const s = scores.find((x) => x.teamId === teamId && x.round === round);
    return s ? String(s.value) : "";
  };

  // Local draft, reconciled when the server score set changes. Only cells the
  // server now agrees with are dropped — a cell the host is still typing in
  // (not yet saved) must survive a refresh triggered by a neighbouring save.
  const signature = scores
    .map((s) => `${s.teamId}:${s.round}=${s.value}`)
    .sort()
    .join("|");
  const [prevSig, setPrevSig] = useState(signature);
  const [draft, setDraft] = useState<Record<string, string>>({});
  if (signature !== prevSig) {
    setPrevSig(signature);
    setDraft((d) =>
      Object.fromEntries(
        Object.entries(d).filter(([k, v]) => {
          const [t, r] = k.split(":");
          return !sameScore(v, serverVal(t, Number(r)));
        }),
      ),
    );
  }

  const key = (teamId: string, round: number) => `${teamId}:${round}`;
  const valueOf = (teamId: string, round: number) => {
    const k = key(teamId, round);
    return k in draft ? draft[k] : serverVal(teamId, round);
  };

  async function commit(teamId: string, round: number) {
    const raw = valueOf(teamId, round).trim();
    if (sameScore(raw, serverVal(teamId, round))) return; // unchanged

    if (raw === "") {
      await call("/api/admin/scores", jsonInit("DELETE", { gameId: game.id, teamId, round }));
      return;
    }
    const num = Number(raw);
    if (!Number.isFinite(num)) return;
    await call(
      "/api/admin/scores",
      jsonInit("POST", { gameId: game.id, teamId, round, rawScore: num }),
    );
  }

  const rounds = Array.from({ length: game.numRounds }, (_, i) => i + 1);
  // Timing games (fastest wins) take seconds to the hundredth; counts are whole.
  const isTiming = game.scoreType === "low_wins";

  return (
    <Panel tone="soft" className="ring-1 ring-gold/40">
      <SectionHeading
        eyebrow="Now Scoring"
        title={game.name}
        trailing={
          <div className="flex items-center gap-1.5">
            <Badge tone={isTiming ? "sage" : "gold"}>
              {isTiming ? "Timing · fastest" : "Count · most"}
            </Badge>
            <span className="text-xs text-sage/60">{game.scoreUnit}</span>
          </div>
        }
      />

      {error && (
        <ErrorNote className="mt-3">
          {error}
        </ErrorNote>
      )}

      <div className="mt-3 space-y-2">
        <div className="flex items-center gap-3 px-3 text-xs uppercase tracking-wider text-sage/50">
          <span className="flex-1">Team</span>
          {rounds.map((r) => (
            <span key={r} className="w-20 text-right sm:w-24">
              {game.numRounds > 1 ? `Round ${r}` : "Score"}
            </span>
          ))}
        </div>

        {teams.map((t) => (
          <div
            key={t.id}
            className="frame-gilt flex items-center gap-3 rounded-card bg-panel/60 px-3 py-2"
          >
            <TeamDot color={t.color} />
            <span className="min-w-0 flex-1 truncate font-body text-cream">{t.name}</span>
            {rounds.map((r) => (
              <input
                key={r}
                type="number"
                inputMode="decimal"
                step={isTiming ? "0.01" : "1"}
                min="0"
                value={valueOf(t.id, r)}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, [key(t.id, r)]: e.target.value }))
                }
                onBlur={() => commit(t.id, r)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
                placeholder={isTiming ? "0.00" : "—"}
                className={cn(inputClass)}
                aria-label={`${t.name} ${game.numRounds > 1 ? `round ${r}` : "score"}`}
              />
            ))}
          </div>
        ))}
      </div>

      {game.numRounds > 1 && (
        <p className="mt-3 text-xs text-sage/60">
          Combined by {game.roundCombineMethod === "average" ? "average" : "sum"} of both
          rounds. Enter or tab out of a field to save.
        </p>
      )}
    </Panel>
  );
}
