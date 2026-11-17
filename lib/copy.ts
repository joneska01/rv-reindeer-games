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

/** TV prompt shown beside the QR code while costume voting is open. */
export const VOTE_PROMPT = {
  headline: "Scan to vote",
  sub: "Rank your top three. Self-voting is gauche but legal.",
} as const;

/** Headings for the full-screen "big moments" on the TV. */
export const MOMENT_COPY = {
  upNext: "Up next",
  winner: "Game complete",
  /** The costume contest is the one game whose results stay secret until the end. */
  votesIn: "The votes are in",
  demerit: "Naughty List",
} as const;

/** One line telling the room how the game they're about to play is scored. */
export function upNextRule(g: {
  scoreType: "high_wins" | "low_wins";
  scoreSource: "manual" | "voting";
  scoreUnit: string;
}): string {
  if (g.scoreSource === "voting") return "Ballots are open. Scan the code and have your say.";
  if (g.scoreType === "low_wins") {
    return /second/i.test(g.scoreUnit) ? "Fastest time wins." : "Lowest score wins.";
  }
  return "Highest score wins.";
}

/** Toast lines when a demerit lands: arch, never crude. `seed` rotates them. */
export const DEMERIT_LINES: ((team: string) => string)[] = [
  (t) => `${t} just got caught. Tsk.`,
  (t) => `${t} has been very naughty.`,
  (t) => `Santa saw that, ${t}.`,
  (t) => `${t} earns a demerit. Worth it?`,
  (t) => `Careful, ${t}. The list is watching.`,
];

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
