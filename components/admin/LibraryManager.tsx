"use client";

import { useState } from "react";
import { useApi, jsonInit } from "@/lib/hooks/useApi";
import { Panel } from "@/components/shared/Panel";
import { Button } from "@/components/shared/Button";
import { Badge } from "@/components/shared/Badge";
import { ErrorNote } from "@/components/shared/ErrorNote";
import { Input, Select, inputClass } from "@/components/shared/Input";
import { ScoringKindSelect } from "./ScoringKindSelect";
import { scoringKindOf } from "@/lib/scoring-kinds";
import type { LibraryGameVM } from "@/lib/view-models";

type Draft = Omit<LibraryGameVM, "id">;

const EMPTY: Draft = {
  name: "",
  scoreType: "high_wins",
  scoreSource: "manual",
  scoreUnit: "points",
  defaultNumRounds: 1,
  supplies: "",
  notes: "",
};

export function LibraryManager({ entries }: { entries: LibraryGameVM[] }) {
  const { call, busy, error } = useApi();
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);

  const filtered = entries.filter((e) => e.name.toLowerCase().includes(query.toLowerCase()));

  function startAdd() {
    setEditId(null);
    setDraft(EMPTY);
    setShowForm(true);
  }
  function startEdit(e: LibraryGameVM) {
    setEditId(e.id);
    const { id: _id, ...rest } = e;
    void _id;
    setDraft(rest);
    setShowForm(true);
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!draft.name.trim()) return;
    const ok = editId
      ? await call(`/api/admin/library/${editId}`, jsonInit("PATCH", draft))
      : await call("/api/admin/library", jsonInit("POST", draft));
    if (ok) {
      setShowForm(false);
      setDraft(EMPTY);
      setEditId(null);
    }
  }

  async function remove(e: LibraryGameVM) {
    if (!confirm(`Delete "${e.name}" from the library? Editions already using it keep their copy.`))
      return;
    await call(`/api/admin/library/${e.id}`, { method: "DELETE" });
  }

  const kind = scoringKindOf(draft.scoreType, draft.scoreSource);

  return (
    <div className="space-y-4">
      {error && (
        <ErrorNote>
          {error}
        </ErrorNote>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search games…"
          className="w-64"
        />
        <Button size="sm" onClick={showForm && !editId ? () => setShowForm(false) : startAdd}>
          {showForm && !editId ? "Close" : "+ New Game"}
        </Button>
      </div>

      {showForm && (
        <Panel inset>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Game name"
              />
              <Input
                value={draft.scoreUnit}
                onChange={(e) => setDraft({ ...draft, scoreUnit: e.target.value })}
                placeholder="Unit"
                disabled={kind !== "count"}
                className={kind !== "count" ? "opacity-60" : undefined}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <ScoringKindSelect value={draft} onChange={(next) => setDraft({ ...draft, ...next })} />
              <Select
                value={draft.defaultNumRounds}
                onChange={(e) => setDraft({ ...draft, defaultNumRounds: Number(e.target.value) })}
                disabled={kind === "voting"}
                className={kind === "voting" ? "opacity-60" : undefined}
              >
                <option value={1}>1 round</option>
                <option value={2}>2 rounds</option>
              </Select>
            </div>
            <Input
              value={draft.supplies}
              onChange={(e) => setDraft({ ...draft, supplies: e.target.value })}
              placeholder="Supplies"
              className="w-full"
            />
            <textarea
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              placeholder="Host notes"
              rows={2}
              className={inputClass(false, "h-auto w-full py-2")}
            />
            <div className="flex gap-2">
              <Button type="submit" disabled={busy || !draft.name.trim()}>
                {editId ? "Save" : "Add to Library"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Panel>
      )}

      <div className="space-y-2">
        {filtered.map((e) => (
          <div
            key={e.id}
            className="frame-gilt flex flex-wrap items-center justify-between gap-3 rounded-card bg-panel/60 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span className="font-body text-cream">{e.name}</span>
              <Badge tone={e.scoreType === "low_wins" ? "sage" : "gold"}>
                {e.scoreType === "low_wins" ? "Low" : "High"}
              </Badge>
              {e.scoreSource === "voting" && <Badge tone="cranberry">Voting</Badge>}
              <span className="text-xs text-sage/60">
                {e.scoreUnit} · {e.defaultNumRounds} rd
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => startEdit(e)}
                className="px-2 py-1 text-xs uppercase tracking-wider text-sage/70 transition-colors hover:text-gold-soft"
              >
                Edit
              </button>
              <button
                onClick={() => remove(e)}
                className="px-2 py-1 text-xs uppercase tracking-wider text-sage/70 transition-colors hover:text-cranberry-bright"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm italic text-sage/70">No games match.</p>
        )}
      </div>
    </div>
  );
}
