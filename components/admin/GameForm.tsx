"use client";

import { useState } from "react";
import { Panel } from "@/components/shared/Panel";
import { Button } from "@/components/shared/Button";
import { Input, Select } from "@/components/shared/Input";
import { ScoringKindSelect } from "./ScoringKindSelect";
import { scoringKindOf } from "@/lib/scoring-kinds";
import type { GameVM, LibraryGameVM } from "@/lib/view-models";

/** What the form edits — the same fields the games API accepts. */
export type GameFormValues = Pick<
  GameVM,
  | "name"
  | "scoringDescription"
  | "scoreType"
  | "scoreSource"
  | "scoreUnit"
  | "numRounds"
  | "roundCombineMethod"
>;

const EMPTY: GameFormValues = {
  name: "",
  scoringDescription: "",
  scoreType: "high_wins",
  scoreSource: "manual",
  scoreUnit: "points",
  numRounds: 1,
  roundCombineMethod: "sum",
};

const valuesOf = (g: GameVM): GameFormValues => ({
  name: g.name,
  scoringDescription: g.scoringDescription,
  scoreType: g.scoreType,
  scoreSource: g.scoreSource,
  scoreUnit: g.scoreUnit,
  numRounds: g.numRounds,
  roundCombineMethod: g.roundCombineMethod,
});

/**
 * Add / edit one edition game. Mount it with `key={editing?.id ?? "new"}` so
 * switching between games (or between add and edit) starts from fresh values.
 */
export function GameForm({
  editing,
  library,
  busy,
  onSubmit,
  onCancel,
}: {
  editing: GameVM | null;
  library: LibraryGameVM[];
  busy: boolean;
  onSubmit: (values: GameFormValues) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<GameFormValues>(editing ? valuesOf(editing) : EMPTY);
  const kind = scoringKindOf(form.scoreType, form.scoreSource);

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

  return (
    <Panel inset>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (form.name.trim()) onSubmit(form);
        }}
        className="space-y-3"
      >
        {!editing && library.length > 0 && (
          <label className="flex flex-col gap-1.5">
            <span className="eyebrow">Start from library</span>
            <Select defaultValue="" onChange={(e) => applyLibrary(e.target.value)} className="max-w-xs">
              <option value="">— from scratch —</option>
              {library.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </label>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Game name"
          />
          {kind === "count" ? (
            <Input
              value={form.scoreUnit}
              onChange={(e) => setForm({ ...form, scoreUnit: e.target.value })}
              placeholder="Unit (rings, points…)"
            />
          ) : (
            <Input value={form.scoreUnit} disabled className="opacity-60" aria-label="Unit" />
          )}
        </div>

        <Input
          value={form.scoringDescription}
          onChange={(e) => setForm({ ...form, scoringDescription: e.target.value })}
          placeholder="Scoring description (shown on scoreboard)"
          className="w-full"
        />

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span className="eyebrow">Scoring</span>
            <ScoringKindSelect value={form} onChange={(next) => setForm({ ...form, ...next })} />
          </label>
          {kind !== "voting" && (
            <label className="flex flex-col gap-1.5">
              <span className="eyebrow">Rounds</span>
              <Select
                value={form.numRounds}
                onChange={(e) => setForm({ ...form, numRounds: Number(e.target.value) })}
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
              </Select>
            </label>
          )}
          {kind !== "voting" && form.numRounds === 2 && (
            <label className="flex flex-col gap-1.5">
              <span className="eyebrow">Combine</span>
              <Select
                value={form.roundCombineMethod}
                onChange={(e) =>
                  setForm({ ...form, roundCombineMethod: e.target.value as GameFormValues["roundCombineMethod"] })
                }
              >
                <option value="sum">Sum</option>
                <option value="average">Average</option>
              </Select>
            </label>
          )}
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={busy || !form.name.trim()}>
            {editing ? "Save Game" : "Add Game"}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Panel>
  );
}
