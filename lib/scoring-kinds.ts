/**
 * The admin picks how a game is scored from one friendly dropdown ("Count",
 * "Timing", "Voting"). Behind the scenes that maps to the DB's score_type +
 * score_source + score_unit. This module is the single source for that mapping,
 * shared by the per-edition game form and the shared game-library form.
 */

export type ScoringKind = "count" | "timing" | "voting";

export interface ScoringFields {
  scoreType: "high_wins" | "low_wins";
  scoreSource: "manual" | "voting";
  scoreUnit: string;
}

export const SCORING_KIND_OPTIONS: { value: ScoringKind; label: string }[] = [
  { value: "count", label: "Count — most wins" },
  { value: "timing", label: "Timing — fastest (seconds)" },
  { value: "voting", label: "Voting — costume ballot" },
];

/** Derive the dropdown choice from a game's stored fields. */
export function scoringKindOf(scoreType: string, scoreSource: string): ScoringKind {
  if (scoreSource === "voting") return "voting";
  return scoreType === "low_wins" ? "timing" : "count";
}

/** Expand a dropdown choice back into the stored fields. `currentUnit` lets a
 *  Count game keep a custom unit (rings, mallows…) the host already typed. */
export function applyScoringKind(kind: ScoringKind, currentUnit: string): ScoringFields {
  if (kind === "timing") {
    return { scoreType: "low_wins", scoreSource: "manual", scoreUnit: "seconds" };
  }
  if (kind === "voting") {
    return { scoreType: "high_wins", scoreSource: "voting", scoreUnit: "vote points" };
  }
  const keep = currentUnit && currentUnit !== "seconds" && currentUnit !== "vote points";
  return { scoreType: "high_wins", scoreSource: "manual", scoreUnit: keep ? currentUnit : "points" };
}
