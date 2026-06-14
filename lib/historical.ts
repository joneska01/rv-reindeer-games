/**
 * Museum history loader — past years are display-only, served from curated JSON
 * fixtures (see /seed-data/*.json), NOT recomputed by the live scoring engine.
 *
 * See docs/superpowers/specs/2026-06-13-rv-reindeer-v3.1-deltas-design.md §4 for
 * why history is preserved verbatim instead of re-scored.
 */
import y2023 from '@/seed-data/2023.json';
import y2024 from '@/seed-data/2024.json';
import y2025 from '@/seed-data/2025.json';

export interface HistoricalTeam {
  name: string;
  display_color: string;
  final_total: number;
  final_rank: number;
}

export interface HistoricalGame {
  name: string;
  score_type: 'high_wins' | 'low_wins';
  score_source: 'manual' | 'voting';
  score_unit: string;
  num_rounds: number;
  sort_order: number;
  /** false = played but excluded from the final total (e.g. 2025 Candy Cane Zipline) */
  counted: boolean;
  /** true = scored with ad-hoc values that match no standard model (e.g. 2025 costume) */
  ad_hoc?: boolean;
}

export interface HistoricalResult {
  team: string;
  game: string;
  /** Placement points the team earned in that game (the 30/28/26… table). */
  placement_points: number;
}

export interface HistoricalFoul {
  team: string;
  count: number;
  /** Whether these fouls were subtracted from the final total that year. */
  applied: boolean;
  description: string | null;
}

export interface HistoricalYear {
  notes: string;
  year: number;
  is_locked: boolean;
  is_test: boolean;
  /** true only for years scored by the canonical rules (2023) — used by the engine test. */
  engine_verified: boolean;
  teams: HistoricalTeam[];
  games: HistoricalGame[];
  results: HistoricalResult[];
  party_fouls: HistoricalFoul[];
}

export const HISTORICAL_YEARS: HistoricalYear[] = [
  y2023 as HistoricalYear,
  y2024 as HistoricalYear,
  y2025 as HistoricalYear,
];

export function getHistoricalYear(year: number): HistoricalYear | undefined {
  return HISTORICAL_YEARS.find((y) => y.year === year);
}

/** Placement points a team earned in a game, or 0 if none / not found. */
export function resultPoints(
  fixture: HistoricalYear,
  team: string,
  game: string,
): number {
  return (
    fixture.results.find((r) => r.team === team && r.game === game)
      ?.placement_points ?? 0
  );
}
