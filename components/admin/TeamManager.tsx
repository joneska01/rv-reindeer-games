"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Panel } from "@/components/shared/Panel";
import { Button } from "@/components/shared/Button";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { cn } from "@/lib/cn";

export interface TeamRow {
  id: string;
  name: string;
  displayColor: string;
}

const MAX_TEAMS = 16;
const SWATCHES = [
  "#C41E3A", "#1A8B3A", "#D4AF37", "#2E5A9E", "#B01E2E", "#6B4FA0",
  "#0E7C7B", "#C46210", "#8B1E3F", "#3A7D44", "#B8860B", "#4A90D9",
];

const inputClass =
  "h-10 rounded-card border border-gilt bg-forest-deep/60 px-3 font-body text-cream outline-none focus:border-gilt-strong placeholder:text-cream/30";

export function TeamManager({
  yearId,
  teams,
  locked,
}: {
  yearId: string;
  teams: TeamRow[];
  locked: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [color, setColor] = useState(SWATCHES[0]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const atCap = teams.length >= MAX_TEAMS;

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

  async function addTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const ok = await call("/api/admin/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ yearId, name: name.trim(), displayColor: color }),
    });
    if (ok) setName("");
  }

  async function saveEdit(id: string) {
    const ok = await call(`/api/admin/teams/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim(), displayColor: editColor }),
    });
    if (ok) setEditId(null);
  }

  async function removeTeam(t: TeamRow) {
    if (!confirm(`Remove ${t.name}?`)) return;
    await call(`/api/admin/teams/${t.id}`, { method: "DELETE" });
  }

  return (
    <section className="space-y-4">
      <SectionHeading
        eyebrow="Setup"
        title="Teams"
        trailing={
          <span className={cn("nums text-sm", atCap ? "text-cranberry-bright" : "text-sage/70")}>
            {teams.length} / {MAX_TEAMS}
          </span>
        }
      />

      {error && (
        <p className="rounded-card border border-cranberry/50 bg-cranberry/15 px-4 py-2.5 text-sm text-cream">
          {error}
        </p>
      )}

      {!locked && (
        <Panel inset>
          <form onSubmit={addTeam} className="flex flex-wrap items-center gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Team name (e.g. Murphys)"
              className={cn(inputClass, "min-w-52 flex-1")}
              disabled={atCap}
            />
            <div className="flex items-center gap-1.5">
              {SWATCHES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setColor(s)}
                  className={cn(
                    "size-6 rounded-full border transition-transform",
                    color === s ? "scale-110 border-cream" : "border-transparent",
                  )}
                  style={{ backgroundColor: s }}
                  aria-label={`Color ${s}`}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="size-7 cursor-pointer rounded border border-gilt bg-transparent"
                aria-label="Custom color"
              />
            </div>
            <Button type="submit" disabled={busy || atCap || !name.trim()}>
              Add Team
            </Button>
          </form>
          {atCap && (
            <p className="mt-2 text-xs text-cranberry-bright">
              Maximum of {MAX_TEAMS} teams reached.
            </p>
          )}
        </Panel>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {teams.map((t) =>
          editId === t.id ? (
            <div key={t.id} className="frame-gilt flex items-center gap-2 rounded-card bg-panel/60 px-3 py-2">
              <input
                type="color"
                value={editColor}
                onChange={(e) => setEditColor(e.target.value)}
                className="size-7 cursor-pointer rounded border border-gilt bg-transparent"
              />
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className={cn(inputClass, "h-9 flex-1")}
              />
              <Button size="sm" onClick={() => saveEdit(t.id)} disabled={busy}>
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>
                Cancel
              </Button>
            </div>
          ) : (
            <div
              key={t.id}
              className="frame-gilt flex items-center justify-between gap-3 rounded-card bg-panel/60 px-4 py-2.5"
            >
              <div className="flex items-center gap-3">
                <span
                  className="size-4 rounded-full ring-1 ring-cream/20"
                  style={{ backgroundColor: t.displayColor }}
                />
                <span className="font-body text-cream">{t.name}</span>
              </div>
              {!locked && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditId(t.id);
                      setEditName(t.name);
                      setEditColor(t.displayColor);
                    }}
                    className="px-2 py-1 text-xs uppercase tracking-wider text-sage/70 transition-colors hover:text-gold-soft"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => removeTeam(t)}
                    className="px-2 py-1 text-xs uppercase tracking-wider text-sage/70 transition-colors hover:text-cranberry-bright"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          ),
        )}
      </div>
      {teams.length === 0 && (
        <p className="text-sm italic text-sage/70">No teams yet. Add your first couple above.</p>
      )}
    </section>
  );
}
