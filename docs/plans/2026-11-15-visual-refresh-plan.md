# RV Reindeer Games — Visual Refresh & QR Voting Plan

**Date:** 2026-11-15 · **Status:** plan agreed, all decisions made · **No code written yet**

## The short version

The app looks classy but sits still. On the TV it is a dark, muted green, and when a score
changes the board simply swaps to the new numbers. This plan adds a QR code for costume
voting, a punchier palette, movement when the standings change, and "big moment" takeovers —
visuals only, no sound.

Five phases. Each is its own branch off `main` and its own PR, with a checkpoint before the
next one starts. Katie kicks off each phase; whatever is not done by party night waits.

**Nothing in this plan touches the scoring engine, the database schema, or env vars.** No
migrations in any phase.

## Decisions made

| # | Decision | Detail |
|---|---|---|
| 1 | Tone | Innuendo and adult phrasing are in. Explicit words are out. This replaces the "never crude" rule in `lib/copy.ts` and the v3.1 spec §3. |
| 2 | Costume tally | Hidden on the TV while voting is open. The TV shows the QR and who has voted. Results appear when the host completes the game. The host's admin console still sees the live tally. |
| 3 | Palette | **A, "After hours"** — today's look turned up: darker pine base, same gold, neon cherry and mint accents. (B, "Velvet lounge", a wine-red re-skin, was considered and passed over.) |
| 4 | Animation library | `motion`, used on the scoreboard only. |
| 5 | Schedule | Phases run one at a time; ship what is ready before the party. |
| 6 | Display | Laptop connected by HDMI to an older TV (see "Party-night display"). |

## Before Phase 1 starts

- **Start from an up-to-date `main`.** The client refactor (`refactor/phase-3-client`) merged
  as PR #10 on 2026-11-15, so the base is ready. The local copy of `main` is behind GitHub and
  needs a `git pull` before the Phase 1 branch is cut. Every phase here edits the files that
  refactor touched (UI kit, `usePolling`, scoreboard components).
- **Shared database warning.** Local and production share one database. Rehearsing on test
  year 9999 makes 9999 the active edition in production too. Fine before the party, but each
  rehearsal ends by resetting 9999 and confirming the real edition is active.

## How the animation gets built (approaches considered)

| Approach | Verdict |
|---|---|
| CSS only (what the app uses today) | Cannot animate rows trading places — the biggest moment on the TV. Kept for ambient effects. |
| **CSS + `motion` library on the scoreboard** | **Chosen.** Handles rows sliding, number count-ups, and screen-to-screen transitions. One dependency. |
| Browser View Transitions | No dependency, but React support is still experimental. Too risky to debut on party night. |

Rules for all motion: it respects the existing reduced-motion setting, it never blocks or
delays real data, and it only reacts to changes seen *after* the page loads (a TV refreshed
mid-party must not replay old moments).

---

## Phase 1 — QR voting on the scoreboard

**Goal:** when the costume contest goes live, guests scan the TV and vote.

- Add `qrcode.react` (check the current version at install time).
- `lib/vote-url.ts` — small pure function that builds the `/vote` address from the address
  the TV itself loaded, so the QR always matches the site the TV is showing. Unit tested.
- `app/scoreboard/page.tsx` — reads the request host and passes the vote URL down.
- `lib/scoreboard.ts` — for an open voting game, send an empty rankings list. The tally is
  withheld on the server, not just hidden on screen, so nobody can peek at `/api/scoreboard`.
- `components/scoreboard/VotePrompt.tsx` (new), used by `NowPlaying.tsx` for voting games:
  large QR on a cream card, "Scan to vote", the address in text for anyone who cannot scan,
  and the existing "Ballots in" tracker.
- QR stays dark-on-cream with a clear margin. Gold-on-green looks nicer and scans worse.

**Proof:** unit test for the URL builder; a test that decodes the rendered QR and checks it
equals the vote URL; screenshot of the TV in voting state at 1280×720 and 1920×1080; a real
phone scan against production on year 9999 after merge (a QR that says `localhost` cannot be
scanned from a phone, so the true scan test happens on the deployed site).

## Phase 2 — Palette and ambience

**Goal:** more color and life on every screen, driven from one file.

- `app/globals.css` — new base and accent tokens for the "After hours" palette; neon-sign
  text and frame utilities; the page background built from tokens instead of fixed colors.
  Starting values from the approved mockup, to be tuned on the real TV:

  | Role | Value | Today |
  |---|---|---|
  | Base (page) | `#06120c` | `#071a0f` |
  | Panel | `#0e2217` | `#13351f` |
  | Gold | `#e2bd4f` | `#d4af37` |
  | Cream (text) | `#f7efd9` | `#f5edd6` |
  | Neon cherry (new) | `#ff3d6e` | — |
  | Mint (new) | `#6ff0c8` | — |
  | Sage (muted text) | `#9db8a4` | `#a8c5a0` |

  Cherry is for "live" signals (Now Playing / Now Voting signs, demerits, moves down); mint is
  for moves up and success. Gold stays the color of points and winners. Cranberry stays for
  buttons and badges that already use it.
- Move the 8 fixed colors in `Confetti`, `StringLights`, and `IntermissionScene` to tokens.
- String lights across the top of the scoreboard; a champagne-bubbles layer for intermission
  (built like `Snowfall`); put the unused `rv-shimmer` animation to work or delete it.
- TV-safe layout: older TVs crop the picture edge, so the scoreboard keeps a ~4% margin and
  minimum text sizes that hold up at 720p.
- Check the 12 team-color swatches still read clearly on the new base.
- Because the palette lives in tokens, home, history, vote, and admin pick it up too. Admin
  gets a legibility check, not a redesign.

**Proof:** before/after screenshots of every public screen and the admin Live console.

## Phase 3 — Scoreboard motion

**Goal:** the standings visibly react when something changes.

- Add `motion`.
- `lib/standings-diff.ts` — pure function comparing the previous and new scoreboard data:
  who moved up or down, whose points changed, who picked up a demerit, whether the active
  game changed or a game finished. Unit tested. Phases 3 and 4 both use it.
- `StandingsBoard.tsx` — rows slide to their new position; totals count up; ▲▼ markers show
  movement for about 20 seconds; a shimmer sweeps the leader's row.
- `NowPlaying.tsx` — the same slide for the live game's rankings.
- Rotating intermission lines fade instead of snapping.

**Proof:** unit tests for the diff; a screen recording on year 9999 of a score entry causing
a rank swap; a check that reduced-motion shows the plain swap.

## Phase 4 — Big moments

**Goal:** full-screen beats for the events people cheer at.

- `lib/scoreboard.ts` — add the most recently completed game and its top three to the data
  the TV receives (the TV currently has no way to know who won a game).
- "Up next" title card when a new game goes live (about 4 seconds, then it settles).
- Winner card when a game completes. For the costume contest this is the reveal of the
  hidden tally: best dressed, top three.
- Naughty List toast when a demerit lands.
- A simple queue so two events arriving together play one after the other.
- Podium: a fade between scoreboard, podium, and final results instead of a hard cut;
  plinths rise on reveal; one confetti burst on first place, then a light fall.

**Proof:** a full mini-event on year 9999 from welcome screen to final results, recorded.

## Phase 5 — Phone voting booth and copy

**Goal:** voting feels good on a phone, and the wording matches the new tone.

- `VoteBooth.tsx` — tap-to-rank couple cards replace the three ranking dropdowns (tap first,
  second, third; tap again to undo). "Which couple are you?" stays as the first step. The
  vote API does not change.
- A light ballot-cast celebration, kept cheap for phones.
- `lib/copy.ts` — rewrite the header rule to match decision 1; add lines for intermission,
  voting, demerits, and "up next". Roughly 25 new lines, drafted for Katie to approve or cut
  one by one before merge.
- Update the tone wording in the v3.1 spec §3 and `CLAUDE.md` to match.
- Full dress rehearsal on year 9999, then reset it.

**Proof:** phone-size screenshots of every booth state; one real ballot cast from a phone.

---

## After every merge

Vercel deploys `main` automatically. No migrations and no new env vars in any phase. Each PR
updates `docs/DEVELOPER_GUIDE.md`.

## Party-night display

- **Laptop over HDMI is the plan.** Roku boxes have no built-in web browser, and the
  third-party browser channels are weak. Mirroring the laptop to the Roku wirelessly is a
  fallback on models that support it, but it adds lag and can drop.
- Set the laptop to never sleep and the browser to full screen.
- Check the TV's picture-size setting ("Just scan" / "Screen fit") so the edges are not cropped.

## Not doing

- Sound.
- Any change to scoring, tie-breakers, or the database.
- WebSockets — polling stays.
- A redesign of the admin panel or the history pages beyond the shared palette.
- Checking who a voter is. `/vote` stays on the honor system, as it is today.
