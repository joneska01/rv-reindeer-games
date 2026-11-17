"use client";

import { useState } from "react";
import Link from "next/link";
import { Panel } from "@/components/shared/Panel";
import { Button } from "@/components/shared/Button";
import { ConfettiBurst } from "@/components/decor/ConfettiBurst";
import { MEDALS } from "@/components/shared/Medal";
import { TeamDot } from "@/components/shared/TeamDot";
import { VOTE_CONFIRM } from "@/lib/copy";
import { cn } from "@/lib/cn";
import { EMPTY_SLOTS, RANK_POINTS, rankOf, tapTeam, toBallotPicks, type Slots } from "@/lib/ballot";
import { usePolling } from "@/lib/hooks/usePolling";
import type { VoteState } from "@/lib/voting";
import { ErrorNote } from "@/components/shared/ErrorNote";
import { Select } from "@/components/shared/Input";

const pickOne = (lines: readonly string[]) => lines[Math.floor(Math.random() * lines.length)];

export function VoteBooth({
  initial,
  pollMs = 10000,
}: {
  initial: VoteState;
  pollMs?: number;
}) {
  const { data: state } = usePolling<VoteState>("/api/vote", pollMs, initial);
  const [voter, setVoter] = useState("");
  const [slots, setSlots] = useState<Slots>(EMPTY_SLOTS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // `line` is chosen when the ballot goes in (an event, not a render) so it stays put.
  const [done, setDone] = useState<null | { line: string }>(null);

  const teams = state?.teams ?? [];
  const picks = toBallotPicks(slots);
  const ready = !!voter && !!picks;
  const full = slots.every(Boolean);
  const nameOf = (id: string | null) => teams.find((t) => t.id === id)?.name ?? "—";

  async function submit() {
    if (!ready || !picks) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ votingTeamId: voter, ...picks }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
      } else {
        setDone({ line: pickOne(data.updated ? VOTE_CONFIRM.updated : VOTE_CONFIRM.first) });
      }
    } finally {
      setBusy(false);
    }
  }

  // ── Render states ──────────────────────────────────────────────
  if (!state.open && !done) {
    return (
      <Shell year={state.year}>
        <div className="text-center">
          <span className="mb-4 block text-4xl">🎭</span>
          <h1 className="text-gilt mb-3 text-3xl">The Booth Is Closed</h1>
          <p className="font-body text-sage">{VOTE_CONFIRM.closed}</p>
        </div>
      </Shell>
    );
  }

  if (done) {
    return (
      <Shell year={state.year}>
        {/* A small one-shot burst: cheap enough for a phone, gone under reduced-motion. */}
        <ConfettiBurst count={24} className="left-1/2 top-[34%]" />
        <div className="text-center">
          <span className="animate-pop mb-4 block text-5xl">🥂</span>
          <h1 className="text-gilt mb-3 text-3xl">Ballot In</h1>
          <p className="font-body text-sage">{done.line}</p>
          {state.open && (
            <Button variant="ghost" className="mt-6" onClick={() => setDone(null)}>
              Change My Ballot
            </Button>
          )}
        </div>
      </Shell>
    );
  }

  return (
    <Shell year={state.year}>
      <div className="mb-6 text-center">
        <p className="eyebrow mb-2">{state.gameName ?? "Costume Ballot"}</p>
        <h1 className="text-gilt text-3xl sm:text-4xl">Cast Your Ballot</h1>
        <p className="mt-2 font-body text-sm text-sage">
          Tap your three favorites in order: {RANK_POINTS[0]}, {RANK_POINTS[1]} and{" "}
          {RANK_POINTS[2]} points. Tap a pick again to undo it. Self-voting is gauche but legal.
        </p>
      </div>

      {error && <ErrorNote className="mb-4">{error}</ErrorNote>}

      <label className="mb-5 block">
        <span className="eyebrow mb-1.5 block">Which couple are you?</span>
        <Select tall value={voter} onChange={(e) => setVoter(e.target.value)} className="w-full">
          <option value="">— choose your couple —</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </Select>
      </label>

      <p className="eyebrow mb-2">Tap your top three</p>
      <ul className="space-y-2">
        {teams.map((t) => {
          const rank = rankOf(slots, t.id);
          return (
            <li key={t.id}>
              <button
                type="button"
                aria-pressed={rank !== null}
                aria-label={rank ? `${t.name}, place ${rank}. Tap to undo.` : t.name}
                onClick={() => setSlots((s) => tapTeam(s, t.id))}
                className={cn(
                  "frame-gilt flex min-h-14 w-full items-center gap-3 rounded-card px-4 text-left",
                  "transition-colors active:scale-[0.99]",
                  rank ? "bg-gold/15 ring-2 ring-gold/70" : "bg-panel/60",
                  // Every place is taken: the rest are inert until a pick is undone.
                  full && !rank && "opacity-45",
                )}
              >
                <TeamDot color={t.color} size="4" />
                <span className="min-w-0 flex-1 truncate font-body text-lg text-cream">{t.name}</span>
                {rank && (
                  <span className="nums flex shrink-0 items-center gap-1.5 text-gold">
                    <span className="text-2xl leading-none">{MEDALS[rank].glyph}</span>
                    <span className="text-sm">{RANK_POINTS[rank - 1]} pts</span>
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Stays in view while the list scrolls: your picks so far, and the button. */}
      <div className="frame-gilt sticky bottom-3 z-10 mt-5 rounded-panel bg-forest-deep/95 p-3">
        <ol className="mb-3 grid grid-cols-3 gap-2 text-center">
          {slots.map((id, i) => (
            <li
              key={i}
              className={cn(
                "min-w-0 rounded-card border px-1.5 py-1.5",
                id ? "border-gold/50 bg-gold/10" : "border-gilt/50 border-dashed",
              )}
            >
              <span className="block text-lg leading-none">{MEDALS[i + 1].glyph}</span>
              <span className="mt-1 block truncate font-body text-xs text-cream/90">
                {id ? nameOf(id) : "—"}
              </span>
            </li>
          ))}
        </ol>
        <Button variant="gold" size="lg" className="w-full" disabled={!ready || busy} onClick={submit}>
          {busy ? "Casting…" : !voter ? "Choose your couple first" : "Cast Ballot"}
        </Button>
      </div>
    </Shell>
  );
}

function Shell({ children, year }: { children: React.ReactNode; year?: number }) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center px-5 py-12">
      <Link
        href="/"
        className="absolute left-5 top-6 font-display text-sm uppercase tracking-[0.18em] text-cream/40 transition-colors hover:text-gold-soft"
      >
        ← Home
      </Link>
      <div className="w-full max-w-md">
        <Panel>{children}</Panel>
        {year && (
          <p className="mt-4 text-center text-xs text-sage/50">
            Reindeer Games · {year}
          </p>
        )}
      </div>
    </main>
  );
}
