"use client";

import { useState } from "react";
import { Panel } from "@/components/shared/Panel";
import { Button } from "@/components/shared/Button";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { cn } from "@/lib/cn";
import { NAUGHTY } from "@/lib/copy";
import { useApi, jsonInit } from "@/lib/hooks/useApi";
import type { TeamVM } from "@/lib/view-models";
import type { LiveFoulVM } from "./types";
import { TeamDot } from "@/components/shared/TeamDot";
import { ErrorNote } from "@/components/shared/ErrorNote";

export function NaughtyList({
  yearId,
  teams,
  fouls,
  locked,
}: {
  yearId: string;
  teams: TeamVM[];
  fouls: LiveFoulVM[];
  locked: boolean;
}) {
  const { call, busy, error } = useApi();
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const foulsFor = (teamId: string) => fouls.filter((f) => f.teamId === teamId);

  async function addFoul(teamId: string) {
    const ok = await call(
      "/api/admin/fouls",
      jsonInit("POST", { yearId, teamId, description: reason.trim() || undefined }),
    );
    if (ok) {
      setReason("");
      setOpenFor(null);
    }
  }

  async function rescind(id: string) {
    await call(`/api/admin/fouls/${id}`, { method: "DELETE" });
  }

  return (
    <Panel>
      <SectionHeading
        eyebrow="Live"
        title={NAUGHTY.label}
        trailing={
          <span className="nums text-sm text-cranberry-bright">
            {fouls.length} {fouls.length === 1 ? NAUGHTY.badgeSingular : NAUGHTY.badgePlural}
          </span>
        }
      />
      <p className="mt-2 text-xs italic text-sage/60">
        {fouls.length === 0 ? NAUGHTY.emptyState : "Each foul shaves a point off the total."}
      </p>

      {error && (
        <ErrorNote className="mt-3">
          {error}
        </ErrorNote>
      )}

      <div className="mt-3 space-y-2">
        {teams.map((t) => {
          const list = foulsFor(t.id);
          return (
            <div
              key={t.id}
              className="frame-gilt rounded-card bg-panel/60 px-3 py-2.5"
            >
              <div className="flex items-center gap-3">
                <TeamDot color={t.color} />
                <span className="min-w-0 flex-1 truncate font-body text-cream">{t.name}</span>
                <span className="nums text-sm text-cranberry-bright">
                  −{list.length}
                </span>
                {!locked && (
                  <Button
                    size="sm"
                    variant="naughty"
                    disabled={busy}
                    onClick={() => {
                      setReason("");
                      setOpenFor(openFor === t.id ? null : t.id);
                    }}
                  >
                    + Foul
                  </Button>
                )}
              </div>

              {openFor === t.id && !locked && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Reason (optional)"
                    className="h-9 flex-1 rounded-card border border-gilt bg-forest-deep/60 px-3 font-body text-sm text-cream outline-none focus:border-gilt-strong placeholder:text-cream/30"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addFoul(t.id);
                    }}
                    autoFocus
                  />
                  <Button size="sm" variant="cranberry" disabled={busy} onClick={() => addFoul(t.id)}>
                    Assess
                  </Button>
                </div>
              )}

              {list.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {list.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => !locked && rescind(f.id)}
                      disabled={busy || locked}
                      title={f.description ?? "Party foul"}
                      className={cn(
                        "group inline-flex items-center gap-1 rounded-pill border border-cranberry/40 bg-cranberry/10 px-2 py-0.5",
                        "font-display text-[0.62rem] uppercase tracking-wider text-cranberry-bright",
                        !locked && "hover:border-cranberry hover:bg-cranberry/20",
                      )}
                    >
                      {f.description || "foul"}
                      {!locked && <span className="opacity-50 group-hover:opacity-100">✕</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
