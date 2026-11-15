# RV Reindeer Games — Codebase Improvement Plan

**Date:** 2026-11-15 · **Reviewed:** everything on `main` (the local feature branch has identical code)
**Baseline before any change:** 21/21 unit tests pass, `eslint` clean, `tsc --noEmit` clean.

## The short version

The foundation is solid: one pure scoring engine, one scoreboard builder, thin routes, Zod on
every body, polling instead of sockets. Nothing needs a rewrite.

What the review turned up, in order of how much it matters on party night:

1. **Real bugs** (Phase 1) — a tie-breaker that mis-orders three-way ties, a game-edit that
   erases data, score entry that can drop typing, and a live console that doesn't update itself.
2. **Security/dependency hygiene** (Phase 0) — a critical advisory on the installed Next.js and
   a session secret that silently falls back to a known string.
3. **Copy-paste** (Phases 2–3) — the same fetch helper 6 times, the same lock check 10 times,
   the same team-row markup 8 times. This is what makes enhancements slow today.

**Honest call on "speed":** the server is not slow and will not be at this scale (one TV polling
every 8s, ~30 phones during the costume vote). The speed that matters is how fast the host can
punch in scores, and that is a Phase 1 bug fix, not a caching project. Caching is listed under
"deliberately skipped."

**Timing recommendation:** the party is weeks away. Ship Phases 0 and 1 before it. Phases 2 and 3
are refactors — do them before the party only if there is time for a full rehearsal on test year
9999 afterward; otherwise they wait until January. A refactor is a bad thing to debut live.

Each phase is its own branch off `main` and its own PR, with a checkpoint before the next starts.

---

## Phase 0 — Safety net and housekeeping

No behavior changes. Small, low-risk, one PR.

| # | Change | Why |
|---|---|---|
| 0.1 | Upgrade `next` (16.2.6 → latest 16.x patch) and `zod`; run `npm audit fix` | `npm audit` reports 8 advisories in production deps, including one **critical** on the installed Next.js and a high on Zod, which parses every request body. |
| 0.2 | Throw at startup if `SESSION_SECRET` is missing in production (`lib/auth.ts:11`) | Today it falls back to a hardcoded string that is in the repo. If the env var were ever dropped in Vercel, anyone could mint an admin cookie. Fail loudly instead. |
| 0.3 | Remove unused `uuid` + `@types/uuid`; move `dotenv` to `devDependencies` | `uuid` is imported nowhere (Postgres generates ids). `dotenv` is only used by CLI scripts. Smaller install, fewer things to patch. |
| 0.4 | Remove `xlsx` and `scripts/parse-excel.ts` *(needs your OK — see Questions)* | `xlsx` has two high-severity advisories with **no fix available**, and it is only used by a one-off script whose output (`seed-data/*.json`) is already committed. |
| 0.5 | Docs cleanup: delete stale `developer.md`; replace the create-next-app `README.md` with a 10-line pointer to the Developer Guide; move PRD v1/v2/v2.1/v2.3 and the `.xlsx`/`.docx` sources into `docs/archive/` | `developer.md` describes routes that don't exist (`/final-results`, `/api/votes`, "edge-cached 5s") and contradicts `docs/DEVELOPER_GUIDE.md`. Two guides that disagree are worse than one. |
| 0.6 | Fix the DB vendor mismatch in docs (`CLAUDE.md` and `DEPLOY.md` say Neon; `docs/DEVELOPER_GUIDE.md` says Prisma Postgres) — confirm which in the Vercel Storage tab first | Whoever debugs a connection problem next needs to know which dashboard to open. |

**Verify:** tests/lint/tsc green, `npm audit --omit=dev` shows no critical/high, `npm run build`
passes (stop the dev server first), smoke the four public pages.

**After merge:** nothing to migrate. Confirm `SESSION_SECRET` is set in Vercel *before* merging 0.2.

---

## Phase 1 — Correctness fixes

Each fix starts with a failing test or a reproduction, then the fix. Ordered by party-night impact.

### 1.1 Three-way ties are ordered wrong *(proven)*

`breakTie` in `lib/scoring.ts:321` only accepts a tie-break step if it separates **every** team.
If a step separates some teams but not all, the whole step is thrown away.

Reproduced with a throwaway script against the real engine — three teams level on points:

```
A: 1 game win, 1 top-3   B: 0 wins, 3 top-3   C: 0 wins, 2 top-3
Engine output:  1. B   2. C   3. A
```

Step 1 is "most game wins." A is the only team with a win and finishes **last** of the three.
Correct order is A, B, C.

- **Fix:** make it a cascade — apply a step, split into sub-groups, and send only the
  still-tied sub-groups to the next step. This is also less code than today.
- **Why it matters:** this decides the podium. Two-way ties are unaffected, which is why the
  existing tests pass.
- **Note:** this changes results for 3+ way ties, so it needs your sign-off (see Questions).

### 1.2 Tie-break step 4 uses the wrong game

`lib/scoring.ts:359` takes the last game by **sort order**. The PRD (§4.6) says the last game
**marked complete**. If games are finished out of order, the wrong game breaks the tie.
`completed_at` is already stored and never read — sort by it. Add a test.

### 1.3 Editing a game erases its scoring description

`GameManager.startEdit` (`components/admin/GameManager.tsx:134`) seeds the form with
`scoringDescription: ""` because the row it receives doesn't carry that field, then PATCHes the
empty string back. Any edit — even a rename — wipes the description.

- **Fix:** pass the field through to the form (and only send changed fields).
- Related: the input says "shown on scoreboard," but nothing displays it anywhere. See Questions.

### 1.4 Score entry can drop what the host is typing *(found by reading; reproduce first)*

Two things in `components/admin/live/ScoreEntry.tsx`:

- Saving one cell sets `busy`, which **disables every input** (`:118`). Tab to the next couple
  and that field is dead until the save returns; on a phone the keyboard closes.
- When the refresh lands, a changed score signature **clears all drafts** (`:38-41`), including
  the value being typed in the next field. On blur it then matches the (empty) server value and
  nothing is saved.

Net effect: fast entry — exactly what the host does mid-game — can silently lose a score.

- **Fix:** track saving per cell, never disable the grid, and clear only the cell that was saved.
- **Proof plan:** reproduce on test year 9999 with a throttled network before changing anything.

### 1.5 A network blip freezes the admin buttons

Every copy of the `call()` helper does `setBusy(true); await fetch(...); setBusy(false)` with no
`try/finally`. If `fetch` throws (wifi hiccup), `busy` stays true and every button stays disabled
until a page reload. Fixed once when the helper is consolidated (3.1) — pulled forward here.

### 1.6 The Live console never updates on its own

The admin Live page only re-fetches after the host's own actions. During the costume vote, the
"Ballots In" roster and tally sit frozen while phones vote; the host has to reload to see them.
(`CLAUDE.md` promises "votes every 10s"; only the public pages poll.)

- **Fix:** `router.refresh()` on a 10s interval, paused when the tab is hidden. Fits the
  existing pattern (server component fetches, client refreshes). Depends on 1.4 so a refresh
  can't wipe in-progress typing.

### 1.7 Any team-save error is reported as "name already exists"

`app/api/admin/teams/route.ts:36` and `teams/[id]/route.ts:35` catch **every** error and return
the duplicate-name message. A dropped DB connection would tell the host to rename the couple.
Check for Postgres unique-violation code `23505`; let everything else surface as a real error.

### 1.8 Deleting the active game leaves a dangling pointer

`years.active_game_id` has no foreign key (`db/schema.ts:50`). Delete the live game in Setup and
the year still points at it. The scoreboard happens to cope, but voting and the live console
each handle it differently.

- **Fix:** add the FK with `ON DELETE SET NULL`.
- **This is the only migration in the plan** — applied manually, and local + prod share a DB.

### 1.9 Close an unvalidated back door

`PATCH /api/admin/years/[id]` accepts `isLocked` and `activeGameId` with none of the checks the
dedicated `live/finish` and `live/active-game` routes enforce. No UI uses them. Remove both
fields so the lock and active-game rules live in exactly one place each.

### 1.10 Small copy fix

The locked banner on Live says "Reopen it from Setup." The Reopen button is on Closing.

**Verify:** new engine tests for 1.1/1.2; a full rehearsal on year 9999 (enter scores fast, vote
from a phone, lock, podium reveal) with screenshots.

**After merge:** run `npx drizzle-kit migrate` for 1.8 before/at merge.

---

## Phase 2 — Simplify the server

Pure refactor. No behavior change; the same requests return the same responses.

| # | Change | Why |
|---|---|---|
| 2.1 | One `adminRoute()` wrapper in `lib/api.ts`: auth + `try/catch` → JSON 500 | Every admin route repeats `return requireAdmin(req, async () => {…})`, and none catch errors, so a DB failure returns an HTML error page the client can't read. |
| 2.2 | Guard helpers: `editableYear(yearId)` and `editableGame(gameId)` | "load row → load year → 404 → 423 if locked" is hand-written **10 times** across routes, with small differences (some skip the 404). One helper means a new route can't forget the lock check. |
| 2.3 | `lib/schemas.ts`: shared Zod field definitions; PATCH schemas derived with `.partial()`; enum values read from the Drizzle enums | The game shape is declared 4 times (games create/patch, library create/patch) and must be hand-synced with the DB enums. Adding a scoring option today means editing 5+ files. |
| 2.4 | Engine: rank each completed game **once** and reuse it for the leaderboard, tie-breakers, and scoreboard | `computeLeaderboard` re-ranks every game for every team (16 teams × 10 games = 160 rankings where 10 would do), then `applyTieBreakers` does it again. It's fast enough today; the win is one obvious data flow. Public function signatures stay the same, so the contract in `CLAUDE.md` holds. |
| 2.5 | Fewer DB round trips: fetch scores inside `getLiveData`'s existing `Promise.all` (sub-select on year); load game + year in one joined query in the guards | Each poll and each score save currently makes 3 sequential trips to Postgres. This takes one off each — a small, free latency win on the path the host feels most. |
| 2.6 | Reorder in one scoped statement (`WHERE year_id = …`) | Today it's N updates in a loop and doesn't check the ids belong to the year. |

**Verify:** existing tests stay green untouched (that's the proof the engine refactor is safe);
add tests for the guard helpers' pure parts; replay the 9999 rehearsal.

---

## Phase 3 — Simplify the client

Pure refactor. Pixel-identical UI.

| # | Change | Why |
|---|---|---|
| 3.1 | Move `useApi` to `lib/hooks/` and use it everywhere | It exists in `components/admin/live/` but `TeamManager`, `GameManager`, `LibraryManager`, `YearManager`, and `ResetEditionButton` each carry their own copy. Six copies → one. |
| 3.2 | `usePolling(url, ms)` hook for `ScoreboardView` and `VoteBooth` | Two hand-rolled intervals. One hook adds "pause when the tab is hidden" and "don't stack requests" for both — ~30 phones stop polling once pocketed. |
| 3.3 | One set of view-model types + mappers (`lib/view-models.ts`) | `{id, name, color}` is declared 4 times (`SbTeam`, `LiveTeamVM`, `VoteTeam`, `TeamRow`), standings twice, games three times, each with its own mapping code. `app/admin/(panel)/live/page.tsx` is 148 lines, mostly this mapping. |
| 3.4 | UI kit: `TeamDot`, `ErrorNote`, `Input`/`Select` in `components/shared/` | Team color-dot markup is pasted in 8 files, the error banner in 9, `inputClass` in 6. A restyle is currently a 9-file edit. |
| 3.5 | Shared `ScoringFields` fieldset; split `GameManager` (426 lines) into form + sortable list | The game form and library form duplicate the scoring-kind/unit/rounds logic. `GameManager` is the largest file in the app and mixes drag-and-drop, form state, and fetching. |

**Verify:** before/after screenshots of every admin screen, the scoreboard in all three modes,
and the vote booth on a phone-width viewport.

---

## Deliberately skipped (YAGNI)

- **Caching `/api/scoreboard`.** Peak load is roughly 3 requests/second for a few minutes a year.
  Caching would add staleness to a live scoreboard to save nothing measurable.
- **WebSockets / server-sent events.** Polling is the right tool here; the decision in
  `CLAUDE.md` stands.
- **Login rate limiting.** One shared password on a once-a-year party app. Worth revisiting only
  if the URL gets shared widely.
- **Route/E2E test suite.** The pure-function tests plus a scripted 9999 rehearsal cover the
  risk. A Playwright suite would cost more to maintain than this app changes.

## What stays exactly as it is

Single scoring engine, `active_game_id` as the one source of truth, completed-games-only
leaderboard, museum fixtures served verbatim, HTTP polling, `/scoreboard` never navigating,
iron-session auth, every existing screen and route.

## Questions for you

1. **Tie-break cascade (1.1)** — OK to change how 3+ way ties are ordered? *Recommendation: yes;
   the current behavior contradicts the PRD's own sequence.*
2. **`xlsx` (0.4)** — delete the parser script and dependency, or keep them as dev-only?
   *Recommendation: delete. The fixtures are committed and the source spreadsheet stays in
   `docs/archive/`.*
3. **Scoring description (1.3)** — just stop erasing it, or also show it on the TV's Now Playing
   panel as the placeholder claims? *Recommendation: fix the erase now; showing it is a small
   new feature for its own PR.*
4. **Phases 2–3 timing** — before the party or January? *Recommendation: January, unless Phase 1
   lands with two-plus weeks to spare.*
