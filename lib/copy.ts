/**
 * Voice of the house: cheeky but classy. Elegant cocktail-party wit — never
 * crude (this goes on a TV that may face the in-laws). Keep it warm and dry.
 * Centralized so the tone stays consistent across every surface.
 */

/** Rotating idle lines for the scoreboard when no game is active. */
export const IDLE_LINES: string[] = [
  "Refill your eggnog — the next event is being arranged.",
  "Intermission. Mingle responsibly.",
  "The judges are deliberating (and topping off their cocoa).",
  "Stand by. Greatness is being scheduled.",
  "A brief pause for hors d'oeuvres.",
];

/** Loading / fetching lines. */
export const LOADING_LINES: string[] = [
  "Polishing the trophies…",
  "Chilling the champagne…",
  "Tallying the festivities…",
  "Stringing the lights…",
];

/** Costume-vote confirmation copy. */
export const VOTE_CONFIRM = {
  first: "Your ballot is cast. 🥂",
  updated: "Ballot updated — flip-flopping is permitted.",
  closed: "The voting booth has closed for the evening.",
} as const;

/** Party-foul framing — the "Naughty List". */
export const NAUGHTY = {
  label: "Naughty List",
  badgeSingular: "demerit",
  badgePlural: "demerits",
  addCta: "Add to the Naughty List",
  emptyState: "Spotless. Suspiciously so.",
} as const;

/** Pick a deterministic-ish line so SSR/CSR agree within a render. */
export function pickLine(lines: string[], seed: number): string {
  return lines[Math.abs(Math.floor(seed)) % lines.length];
}
