"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Panel } from "@/components/shared/Panel";
import { Button } from "@/components/shared/Button";
import { Badge } from "@/components/shared/Badge";
import { cn } from "@/lib/cn";
import { VOTE_CONFIRM } from "@/lib/copy";
import type { VoteState } from "@/lib/voting";

const inputClass =
  "h-11 w-full rounded-card border border-gilt bg-forest-deep/60 px-3 font-body text-cream outline-none focus:border-gilt-strong";

const RANKS = [
  { key: "firstPlaceTeamId", label: "1st place", points: 10 },
  { key: "secondPlaceTeamId", label: "2nd place", points: 7 },
  { key: "thirdPlaceTeamId", label: "3rd place", points: 5 },
] as const;

export function VoteBooth({
  initial,
  pollMs = 10000,
}: {
  initial: VoteState;
  pollMs?: number;
}) {
  const [state, setState] = useState<VoteState>(initial);
  const [voter, setVoter] = useState("");
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<null | "first" | "updated">(null);
  const doneRef = useRef(false);

  async function load() {
    try {
      const res = await fetch("/api/vote", { cache: "no-store" });
      const data = (await res.json()) as VoteState;
      setState(data);
    } catch {
      /* keep last state */
    }
  }

  useEffect(() => {
    const id = setInterval(load, pollMs);
    return () => clearInterval(id);
  }, [pollMs]);

  const teams = state?.teams ?? [];
  const chosen = RANKS.map((r) => picks[r.key]).filter(Boolean);
  const distinct = new Set(chosen).size === chosen.length;
  const ready = !!voter && chosen.length === 3 && distinct;

  async function submit() {
    if (!ready) return;
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
        doneRef.current = true;
        setDone(data.updated ? "updated" : "first");
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
        <div className="text-center">
          <span className="mb-4 block text-4xl">🥂</span>
          <h1 className="text-gilt mb-3 text-3xl">
            {done === "updated" ? "Ballot Updated" : "Ballot Cast"}
          </h1>
          <p className="font-body text-sage">
            {done === "updated" ? VOTE_CONFIRM.updated : VOTE_CONFIRM.first}
          </p>
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
          Rank your top three. 10 / 7 / 5 points. Self-voting is gauche but legal.
        </p>
      </div>

      {error && (
        <p className="mb-4 rounded-card border border-cranberry/50 bg-cranberry/15 px-4 py-2.5 text-sm text-cream">
          {error}
        </p>
      )}

      <label className="mb-5 block">
        <span className="eyebrow mb-1.5 block">Which couple are you?</span>
        <select value={voter} onChange={(e) => setVoter(e.target.value)} className={inputClass}>
          <option value="">— choose your couple —</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </label>

      <div className="space-y-3">
        {RANKS.map((r) => (
          <label key={r.key} className="block">
            <span className="eyebrow mb-1.5 flex items-center gap-2">
              {r.label} <Badge tone="gold">{r.points} pts</Badge>
            </span>
            <select
              value={picks[r.key] ?? ""}
              onChange={(e) => setPicks((p) => ({ ...p, [r.key]: e.target.value }))}
              className={cn(inputClass)}
            >
              <option value="">— pick a couple —</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </label>
        ))}
      </div>

      {chosen.length === 3 && !distinct && (
        <p className="mt-3 text-sm text-cranberry-bright">
          Pick three different couples for 1st, 2nd, and 3rd.
        </p>
      )}

      <Button
        variant="gold"
        size="lg"
        className="mt-6 w-full"
        disabled={!ready || busy}
        onClick={submit}
      >
        {busy ? "Casting…" : "Cast Ballot"}
      </Button>
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
