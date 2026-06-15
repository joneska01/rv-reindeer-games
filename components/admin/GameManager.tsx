"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Panel } from "@/components/shared/Panel";
import { Button } from "@/components/shared/Button";
import { Badge } from "@/components/shared/Badge";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { cn } from "@/lib/cn";

export interface GameRow {
  id: string;
  name: string;
  scoreType: "high_wins" | "low_wins";
  scoreSource: "manual" | "voting";
  scoreUnit: string;
  numRounds: number;
  roundCombineMethod: "sum" | "average";
  isComplete: boolean;
}

export interface LibraryRow {
  id: string;
  name: string;
  scoreType: "high_wins" | "low_wins";
  scoreSource: "manual" | "voting";
  scoreUnit: string;
  defaultNumRounds: number;
}

interface FormState {
  name: string;
  scoringDescription: string;
  scoreType: "high_wins" | "low_wins";
  scoreSource: "manual" | "voting";
  scoreUnit: string;
  numRounds: number;
  roundCombineMethod: "sum" | "average";
}

const EMPTY: FormState = {
  name: "",
  scoringDescription: "",
  scoreType: "high_wins",
  scoreSource: "manual",
  scoreUnit: "points",
  numRounds: 1,
  roundCombineMethod: "sum",
};

// One friendly dropdown drives the underlying score type / source / unit.
type ScoringKind = "count" | "timing" | "voting";

function scoringKindOf(scoreType: string, scoreSource: string): ScoringKind {
  if (scoreSource === "voting") return "voting";
  return scoreType === "low_wins" ? "timing" : "count";
}

function applyScoringKind(
  kind: ScoringKind,
  currentUnit: string,
): Pick<FormState, "scoreType" | "scoreSource" | "scoreUnit"> {
  if (kind === "timing") {
    return { scoreType: "low_wins", scoreSource: "manual", scoreUnit: "seconds" };
  }
  if (kind === "voting") {
    return { scoreType: "high_wins", scoreSource: "voting", scoreUnit: "vote points" };
  }
  // count: most wins — keep any custom unit the host typed, else default.
  const keep = currentUnit && currentUnit !== "seconds" && currentUnit !== "vote points";
  return { scoreType: "high_wins", scoreSource: "manual", scoreUnit: keep ? currentUnit : "points" };
}

const inputClass =
  "h-10 rounded-card border border-gilt bg-forest-deep/60 px-3 font-body text-cream outline-none focus:border-gilt-strong placeholder:text-cream/30";

export function GameManager({
  yearId,
  games,
  library,
  locked,
}: {
  yearId: string;
  games: GameRow[];
  library: LibraryRow[];
  locked: boolean;
}) {
  const router = useRouter();

  // Keep a local order for snappy drag; re-sync when the server list changes.
  const ids = games.map((g) => g.id).join(",");
  const [items, setItems] = useState(games);
  const [prevIds, setPrevIds] = useState(ids);
  if (ids !== prevIds) {
    setItems(games);
    setPrevIds(ids);
  }

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function call(url: string, init: RequestInit): Promise<boolean> {
    setError(null);
    setBusy(true);
    const res = await fetch(url, init);
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
      return false;
    }
    router.refresh();
    return true;
  }

  function startAdd() {
    setEditId(null);
    setForm(EMPTY);
    setShowForm(true);
  }

  function startEdit(g: GameRow) {
    setEditId(g.id);
    setForm({
      name: g.name,
      scoringDescription: "",
      scoreType: g.scoreType,
      scoreSource: g.scoreSource,
      scoreUnit: g.scoreUnit,
      numRounds: g.numRounds,
      roundCombineMethod: g.roundCombineMethod,
    });
    setShowForm(true);
  }

  function applyLibrary(libId: string) {
    const lib = library.find((l) => l.id === libId);
    if (!lib) return;
    setForm((f) => ({
      ...f,
      name: lib.name,
      scoreType: lib.scoreType,
      scoreSource: lib.scoreSource,
      scoreUnit: lib.scoreUnit,
      numRounds: lib.defaultNumRounds,
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const ok = editId
      ? await call(`/api/admin/games/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        })
      : await call("/api/admin/games", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, yearId }),
        });
    if (ok) {
      setShowForm(false);
      setForm(EMPTY);
      setEditId(null);
    }
  }

  async function removeGame(g: GameRow) {
    if (!confirm(`Remove "${g.name}"?`)) return;
    await call(`/api/admin/games/${g.id}`, { method: "DELETE" });
  }

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((g) => g.id === active.id);
    const newIndex = items.findIndex((g) => g.id === over.id);
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    await call("/api/admin/games/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ yearId, orderedIds: next.map((g) => g.id) }),
    });
  }

  const kind = scoringKindOf(form.scoreType, form.scoreSource);

  return (
    <section className="space-y-4">
      <SectionHeading
        eyebrow="Setup"
        title="Games"
        trailing={
          !locked && (
            <Button size="sm" onClick={showForm && !editId ? () => setShowForm(false) : startAdd}>
              {showForm && !editId ? "Close" : "+ Add Game"}
            </Button>
          )
        }
      />

      {error && (
        <p className="rounded-card border border-cranberry/50 bg-cranberry/15 px-4 py-2.5 text-sm text-cream">
          {error}
        </p>
      )}

      {showForm && !locked && (
        <Panel inset>
          <form onSubmit={submit} className="space-y-3">
            {!editId && library.length > 0 && (
              <label className="flex flex-col gap-1.5">
                <span className="eyebrow">Start from library</span>
                <select
                  defaultValue=""
                  onChange={(e) => applyLibrary(e.target.value)}
                  className={cn(inputClass, "max-w-xs")}
                >
                  <option value="">— from scratch —</option>
                  {library.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Game name"
                className={inputClass}
              />
              {kind === "count" ? (
                <input
                  value={form.scoreUnit}
                  onChange={(e) => setForm({ ...form, scoreUnit: e.target.value })}
                  placeholder="Unit (rings, points…)"
                  className={inputClass}
                />
              ) : (
                <input
                  value={form.scoreUnit}
                  disabled
                  className={cn(inputClass, "opacity-60")}
                  aria-label="Unit"
                />
              )}
            </div>

            <input
              value={form.scoringDescription}
              onChange={(e) => setForm({ ...form, scoringDescription: e.target.value })}
              placeholder="Scoring description (shown on scoreboard)"
              className={cn(inputClass, "w-full")}
            />

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="flex flex-col gap-1.5">
                <span className="eyebrow">Scoring</span>
                <select
                  value={kind}
                  onChange={(e) =>
                    setForm({ ...form, ...applyScoringKind(e.target.value as ScoringKind, form.scoreUnit) })
                  }
                  className={inputClass}
                >
                  <option value="count">Count — most wins</option>
                  <option value="timing">Timing — fastest (seconds)</option>
                  <option value="voting">Voting — costume ballot</option>
                </select>
              </label>
              {kind !== "voting" && (
                <label className="flex flex-col gap-1.5">
                  <span className="eyebrow">Rounds</span>
                  <select
                    value={form.numRounds}
                    onChange={(e) => setForm({ ...form, numRounds: Number(e.target.value) })}
                    className={inputClass}
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                  </select>
                </label>
              )}
              {kind !== "voting" && form.numRounds === 2 && (
                <label className="flex flex-col gap-1.5">
                  <span className="eyebrow">Combine</span>
                  <select
                    value={form.roundCombineMethod}
                    onChange={(e) =>
                      setForm({ ...form, roundCombineMethod: e.target.value as FormState["roundCombineMethod"] })
                    }
                    className={inputClass}
                  >
                    <option value="sum">Sum</option>
                    <option value="average">Average</option>
                  </select>
                </label>
              )}
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={busy || !form.name.trim()}>
                {editId ? "Save Game" : "Add Game"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Panel>
      )}

      {items.length === 0 ? (
        <p className="text-sm italic text-sage/70">
          No games yet. Add from the library or build one from scratch.
        </p>
      ) : (
        <DndContext
          id="game-reorder"
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext items={items.map((g) => g.id)} strategy={verticalListSortingStrategy}>
            <ol className="space-y-2">
              {items.map((g, i) => (
                <SortableGameRow
                  key={g.id}
                  game={g}
                  index={i}
                  locked={locked}
                  onEdit={() => startEdit(g)}
                  onRemove={() => removeGame(g)}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
}

function SortableGameRow({
  game,
  index,
  locked,
  onEdit,
  onRemove,
}: {
  game: GameRow;
  index: number;
  locked: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: game.id,
    disabled: locked,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "frame-gilt flex items-center gap-3 rounded-card bg-panel/60 px-3 py-2.5",
        isDragging && "opacity-60",
      )}
    >
      {!locked && (
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab px-1 text-gold-soft/50 hover:text-gold-soft active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          ⠿
        </button>
      )}
      <span className="nums w-6 text-center text-sm text-sage/60">{index + 1}</span>
      <span className="min-w-0 flex-1 truncate font-body text-cream">{game.name}</span>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone={game.scoreType === "low_wins" ? "sage" : "gold"}>
          {game.scoreType === "low_wins" ? "Low" : "High"}
        </Badge>
        {game.scoreSource === "voting" && <Badge tone="cranberry">Voting</Badge>}
        {game.numRounds === 2 && <Badge tone="neutral">2 rounds</Badge>}
        {game.isComplete && <Badge tone="gold">Done</Badge>}
      </div>
      {!locked && (
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="px-2 py-1 text-xs uppercase tracking-wider text-sage/70 transition-colors hover:text-gold-soft"
          >
            Edit
          </button>
          <button
            onClick={onRemove}
            className="px-2 py-1 text-xs uppercase tracking-wider text-sage/70 transition-colors hover:text-cranberry-bright"
          >
            Remove
          </button>
        </div>
      )}
    </li>
  );
}
