"use client";

import { useState } from "react";
import { useApi, jsonInit } from "@/lib/hooks/useApi";
import { Button } from "@/components/shared/Button";
import { ErrorNote } from "@/components/shared/ErrorNote";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { GameForm, type GameFormValues } from "./GameForm";
import { SortableGameList } from "./SortableGameList";
import type { GameVM, LibraryGameVM } from "@/lib/view-models";

/** The Games section of an edition's setup page: add/edit form + sortable list. */
export function GameManager({
  yearId,
  games,
  library,
  locked,
}: {
  yearId: string;
  games: GameVM[];
  library: LibraryGameVM[];
  locked: boolean;
}) {
  const { call, busy, error } = useApi();
  const [editing, setEditing] = useState<GameVM | null>(null);
  const [showForm, setShowForm] = useState(false);

  function startAdd() {
    setEditing(null);
    setShowForm(true);
  }

  function startEdit(g: GameVM) {
    setEditing(g);
    setShowForm(true);
  }

  async function submit(values: GameFormValues) {
    const ok = editing
      ? await call(`/api/admin/games/${editing.id}`, jsonInit("PATCH", values))
      : await call("/api/admin/games", jsonInit("POST", { ...values, yearId }));
    if (ok) {
      setShowForm(false);
      setEditing(null);
    }
  }

  async function removeGame(g: GameVM) {
    if (!confirm(`Remove "${g.name}"?`)) return;
    await call(`/api/admin/games/${g.id}`, { method: "DELETE" });
  }

  function reorder(orderedIds: string[]) {
    return call("/api/admin/games/reorder", jsonInit("POST", { yearId, orderedIds }));
  }

  return (
    <section className="space-y-4">
      <SectionHeading
        eyebrow="Setup"
        title="Games"
        trailing={
          !locked && (
            <Button size="sm" onClick={showForm && !editing ? () => setShowForm(false) : startAdd}>
              {showForm && !editing ? "Close" : "+ Add Game"}
            </Button>
          )
        }
      />

      {error && <ErrorNote>{error}</ErrorNote>}

      {showForm && !locked && (
        <GameForm
          key={editing?.id ?? "new"}
          editing={editing}
          library={library}
          busy={busy}
          onSubmit={submit}
          onCancel={() => setShowForm(false)}
        />
      )}

      {games.length === 0 ? (
        <p className="text-sm italic text-sage/70">
          No games yet. Add from the library or build one from scratch.
        </p>
      ) : (
        <SortableGameList
          games={games}
          locked={locked}
          onEdit={startEdit}
          onRemove={removeGame}
          onReorder={reorder}
        />
      )}
    </section>
  );
}
