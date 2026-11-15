"use client";

import { useState } from "react";
import { useApi, jsonInit } from "@/lib/hooks/useApi";
import { Panel } from "@/components/shared/Panel";
import { Badge } from "@/components/shared/Badge";
import { Button, buttonClass } from "@/components/shared/Button";
import { cn } from "@/lib/cn";
import { ErrorNote } from "@/components/shared/ErrorNote";
import { Input, Select } from "@/components/shared/Input";

export interface YearRow {
  id: string;
  year: number;
  isActive: boolean;
  isLocked: boolean;
  isTest: boolean;
  teamCount: number;
  gameCount: number;
}

export function YearManager({ years }: { years: YearRow[] }) {
  const { call, busy, error, setError } = useApi();

  // Create form
  const [yearNum, setYearNum] = useState("");
  const [isTest, setIsTest] = useState(false);
  const [copyFrom, setCopyFrom] = useState("");
  const [creating, setCreating] = useState(false);

  async function createYear(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(yearNum);
    if (!Number.isInteger(n) || n < 2000 || n > 9999) {
      setError("Enter a year between 2000 and 9999 (use 9999 for test runs).");
      return;
    }
    setCreating(true);
    const okRes = await call(
      "/api/admin/years",
      jsonInit("POST", { year: n, isTest, copyTeamsFromYearId: copyFrom || undefined }),
    );
    setCreating(false);
    if (okRes) {
      setYearNum("");
      setIsTest(false);
      setCopyFrom("");
    }
  }

  async function setActive(id: string) {
    await call(`/api/admin/years/${id}`, jsonInit("PATCH", { isActive: true }));
  }

  async function deleteYear(row: YearRow) {
    if (
      !confirm(
        `Permanently delete Year ${row.year} and all its teams, games, scores, votes, and fouls? This cannot be undone.`,
      )
    )
      return;
    await call(`/api/admin/years/${row.id}`, { method: "DELETE" });
  }

  return (
    <div className="space-y-6">
      {error && (
        <ErrorNote>
          {error}
        </ErrorNote>
      )}

      {/* Create */}
      <Panel>
        <form onSubmit={createYear} className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="eyebrow">Year</span>
            <Input
              tall
              type="number"
              value={yearNum}
              onChange={(e) => setYearNum(e.target.value)}
              placeholder="2026"
              className="w-28"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="eyebrow">Copy teams from</span>
            <Select
              tall
              value={copyFrom}
              onChange={(e) => setCopyFrom(e.target.value)}
              className="w-44"
            >
              <option value="">— none —</option>
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.year}
                </option>
              ))}
            </Select>
          </label>

          <label className="flex h-11 items-center gap-2 text-sm text-cream/80">
            <input
              type="checkbox"
              checked={isTest}
              onChange={(e) => setIsTest(e.target.checked)}
              className="size-4 accent-amber"
            />
            This is a test run
          </label>

          <Button type="submit" disabled={creating} variant="gold">
            {creating ? "Creating…" : "Create Year"}
          </Button>
        </form>
      </Panel>

      {/* List */}
      <div className="space-y-3">
        {years.length === 0 && (
          <p className="text-sm italic text-sage/70">No years yet. Create the first one above.</p>
        )}
        {years.map((y) => (
          <div
            key={y.id}
            className={cn(
              "frame-gilt flex flex-wrap items-center justify-between gap-4 rounded-panel px-5 py-4 backdrop-blur-sm",
              y.isTest ? "border-amber/50 bg-amber/5" : "bg-panel/60",
            )}
          >
            <div className="flex items-center gap-4">
              <span className="nums text-2xl text-gilt">{y.year}</span>
              <div className="flex flex-wrap gap-1.5">
                {y.isActive && <Badge tone="gold">Active</Badge>}
                {y.isLocked && <Badge tone="cranberry">Locked</Badge>}
                {y.isTest && <Badge tone="amber">⚠ Test</Badge>}
              </div>
              <span className="text-xs text-sage/70">
                {y.teamCount} teams · {y.gameCount} games
              </span>
            </div>

            <div className="flex items-center gap-3">
              <a href={`/admin/setup/${y.id}`} className={buttonClass("ghost", "sm")}>
                Manage
              </a>
              {!y.isActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActive(y.id)}
                  disabled={busy}
                >
                  Set Active
                </Button>
              )}
              {y.isTest && (
                <Button
                  variant="naughty"
                  size="sm"
                  onClick={() => deleteYear(y)}
                  disabled={busy}
                >
                  Delete
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
