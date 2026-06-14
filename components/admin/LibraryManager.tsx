"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Panel } from "@/components/shared/Panel";
import { Button } from "@/components/shared/Button";
import { Badge } from "@/components/shared/Badge";
import { cn } from "@/lib/cn";

export interface LibraryEntry {
  id: string;
  name: string;
  scoreType: "high_wins" | "low_wins";
  scoreSource: "manual" | "voting";
  scoreUnit: string;
  defaultNumRounds: number;
  supplies: string;
  notes: string;
}

type Draft = Omit<LibraryEntry, "id">;

const EMPTY: Draft = {
  name: "",
  scoreType: "high_wins",
  scoreSource: "manual",
  scoreUnit: "points",
  defaultNumRounds: 1,
  supplies: "",
  notes: "",
};

const inputClass =
  "h-10 rounded-card border border-gilt bg-forest-deep/60 px-3 font-body text-cream outline-none focus:border-gilt-strong placeholder:text-cream/30";

export function LibraryManager({ entries }: { entries: LibraryEntry[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);

  const filtered = entries.filter((e) => e.name.toLowerCase().includes(query.toLowerCase()));

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
    setDraft(EMPTY);
    setShowForm(true);
  }
  function startEdit(e: LibraryEntry) {
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
      ? await call(`/api/admin/library/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        })
      : await call("/api/admin/library", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        });
    if (ok) {
      setShowForm(false);
      setDraft(EMPTY);
      setEditId(null);
    }
  }

  async function remove(e: LibraryEntry) {
    if (!confirm(`Delete "${e.name}" from the library? Editions already using it keep their copy.`))
      return;
    await call(`/api/admin/library/${e.id}`, { method: "DELETE" });
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-card border border-cranberry/50 bg-cranberry/15 px-4 py-2.5 text-sm text-cream">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search games…"
          className={cn(inputClass, "w-64")}
        />
        <Button size="sm" onClick={showForm && !editId ? () => setShowForm(false) : startAdd}>
          {showForm && !editId ? "Close" : "+ New Game"}
        </Button>
      </div>

      {showForm && (
        <Panel inset>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Game name"
                className={inputClass}
              />
              <input
                value={draft.scoreUnit}
                onChange={(e) => setDraft({ ...draft, scoreUnit: e.target.value })}
                placeholder="Unit"
                className={inputClass}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <select
                value={draft.scoreType}
                onChange={(e) => setDraft({ ...draft, scoreType: e.target.value as Draft["scoreType"] })}
                className={inputClass}
              >
                <option value="high_wins">High score wins</option>
                <option value="low_wins">Low score wins</option>
              </select>
              <select
                value={draft.scoreSource}
                onChange={(e) => setDraft({ ...draft, scoreSource: e.target.value as Draft["scoreSource"] })}
                className={inputClass}
              >
                <option value="manual">Manual</option>
                <option value="voting">Voting</option>
              </select>
              <select
                value={draft.defaultNumRounds}
                onChange={(e) => setDraft({ ...draft, defaultNumRounds: Number(e.target.value) })}
                className={inputClass}
              >
                <option value={1}>1 round</option>
                <option value={2}>2 rounds</option>
              </select>
            </div>
            <input
              value={draft.supplies}
              onChange={(e) => setDraft({ ...draft, supplies: e.target.value })}
              placeholder="Supplies"
              className={cn(inputClass, "w-full")}
            />
            <textarea
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              placeholder="Host notes"
              rows={2}
              className={cn(inputClass, "h-auto w-full py-2")}
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
