"use client";

import { useState } from "react";
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
import { Badge } from "@/components/shared/Badge";
import { cn } from "@/lib/cn";
import type { GameVM } from "@/lib/view-models";

/** Drag-to-reorder list of an edition's games. It owns only the drag state; the
 *  parent decides what Edit / Remove / a finished reorder actually do. */
export function SortableGameList({
  games,
  locked,
  onEdit,
  onRemove,
  onReorder,
}: {
  games: GameVM[];
  locked: boolean;
  onEdit: (g: GameVM) => void;
  onRemove: (g: GameVM) => void;
  onReorder: (orderedIds: string[]) => void;
}) {
  // Keep a local order for snappy drag; re-sync when the server list changes.
  const ids = games.map((g) => g.id).join(",");
  const [items, setItems] = useState(games);
  const [prevIds, setPrevIds] = useState(ids);
  if (ids !== prevIds) {
    setItems(games);
    setPrevIds(ids);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((g) => g.id === active.id);
    const newIndex = items.findIndex((g) => g.id === over.id);
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    onReorder(next.map((g) => g.id));
  }

  return (
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
              onEdit={() => onEdit(g)}
              onRemove={() => onRemove(g)}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

function SortableGameRow({
  game,
  index,
  locked,
  onEdit,
  onRemove,
}: {
  game: GameVM;
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
