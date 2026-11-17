/**
 * Voice of the house: a holiday happy hour. Cheeky, adult, a little naughty:
 * innuendo and sly double meanings are welcome. Still out: explicit words, slurs,
 * and anything that mocks someone's body or marriage for real. The joke is always
 * on the *party*, never at one person's expense, and it stays warm.
 * Centralized so the tone stays consistent across every surface.
 */

/** Rotating idle lines for the scoreboard when no game is active. */
export const IDLE_LINES: string[] = [
  "Refill your eggnog — the next event is being arranged.",
  "Intermission. Mingle responsibly.",
  "The judges are deliberating (and topping off their cocoa).",
  "Stand by. Greatness is being scheduled.",
  "A brief pause for hors d'oeuvres.",
  // New in Phase 5 (I1–I8):
  "Top off your drink. Then top off your neighbor's.",
  "Santa's checking his list twice. Yours is longer.",
  "Intermission: a fine time to flirt with your own spouse.",
  "Nice list, naughty list. Tonight, everyone's on both.",
  "Hydrate. Or don't. We're not your mother.",
  "Somebody's getting coal tonight. Somebody else asked for it.",
  "The next game is being set up. Please keep your hands to yourselves.",
  "A moment of silence for anyone still sober.",
];

/** Loading / fetching lines. */
export const LOADING_LINES: string[] = [
  "Polishing the trophies…",
  "Chilling the champagne…",
  "Tallying the festivities…",
  "Stringing the lights…",
];

/** Costume-vote confirmation copy. `first` and `updated` rotate; `closed` is fixed. */
export const VOTE_CONFIRM = {
  first: [
    "Your ballot is cast. 🥂",
    // New in Phase 5 (V1–V4):
    "Ballot cast. Gossip responsibly. 🥂",
    "Vote recorded. Your secret's safe with us.",
    "Cast. Now go look innocent.",
    "Your taste has been noted. And judged.",
  ],
  updated: [
    "Ballot updated — flip-flopping is permitted.",
    // New in Phase 5 (V5–V6):
    "Changed your mind? Bold. Ballot updated.",
    "Ballot updated. Everyone deserves a second look.",
  ],
  // V7 replaces "The voting booth has closed for the evening."
  closed: "The booth is closed. Last call for ballots has come and gone.",
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

/** A quip under the rule on the Up Next card (U1–U6, all new in Phase 5). */
export const UP_NEXT_TAGS: string[] = [
  "Loosen up. Literally.",
  "Pace yourself. Or don't.",
  "Bragging rights are on the line. So is your dignity.",
  "May the best couple win. May the rest sulk.",
  "Competitive spouses, assemble.",
  "Dignity is optional. Winning is not.",
];

/** Toast lines when a demerit lands: sly, never explicit. Rotated by moment id. */
export const DEMERIT_LINES: ((team: string) => string)[] = [
  (t) => `${t} just got caught. Tsk.`,
  (t) => `${t} has been very naughty.`,
  (t) => `Santa saw that, ${t}.`,
  (t) => `${t} earns a demerit. Worth it?`,
  (t) => `Careful, ${t}. The list is watching.`,
  // New in Phase 5 (D1–D6):
  (t) => `${t} is getting coal, and seems to enjoy it.`,
  (t) => `${t}: one demerit. Worth every second.`,
  (t) => `Bad behavior, ${t}. We approve. It'll still cost you.`,
  (t) => `${t} just made the Naughty List. Again, probably.`,
  (t) => `Not in front of the in-laws, ${t}.`,
  (t) => `${t} has been very, very good at being bad.`,
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
