"use client";

import { useApi } from "@/lib/hooks/useApi";
import { Panel } from "@/components/shared/Panel";
import { Button } from "@/components/shared/Button";

export function ResetEditionButton({ yearId, year }: { yearId: string; year: number }) {
  const { call, busy, error } = useApi();

  async function reset() {
    if (
      !confirm(
        `Reset test edition ${year}? This clears all scores, costume votes, and party fouls and marks every game incomplete. Teams and games are kept. This cannot be undone.`,
      )
    )
      return;
    await call(`/api/admin/years/${yearId}/reset`, { method: "POST" });
  }

  return (
    <Panel tone="soft" className="ring-1 ring-amber/40">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-sm uppercase tracking-wider text-amber">
            Rehearsal Reset
          </p>
          <p className="mt-1 max-w-md text-sm text-sage">
            Wipe scores, votes, and fouls back to a clean pre-event slate. Keeps your
            teams and games so you can run the whole show again.
          </p>
          {error && <p className="mt-2 text-sm text-cranberry-bright">{error}</p>}
        </div>
        <Button variant="naughty" disabled={busy} onClick={reset}>
          {busy ? "Resetting…" : "Reset Gameplay"}
        </Button>
      </div>
    </Panel>
  );
}
