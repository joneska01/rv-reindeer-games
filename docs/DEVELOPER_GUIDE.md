# RV Reindeer Games — Developer Guide

A friendly, end-to-end tour of the codebase for a developer who is new to the
project (and fairly new to web development). By the end you should know **what
each part does, where it lives, and where to go to change a given feature.**

> New here? Read sections 1–4 top to bottom, then jump to whatever you're working
> on. Section 9 ("Common tasks") is a recipe book for typical changes.

---

## 1. What the app is

A Christmas-party live-scoring web app. Couples ("teams") compete in party games;
a TV/projector shows a live gilded scoreboard. There's an admin panel for the
host to run the night, a public scoreboard for the room, a costume-vote booth on
guests' phones, and a museum of past years.

The vibe is "cheeky but classy" — an elegant holiday cocktail party.

## 2. Tech stack (and why)

| Piece | What it is | Where |
|---|---|---|
| **Next.js 16 (App Router)** | React framework. Pages are folders under `app/`; server code and UI live together. | `app/` |
| **React 19 + TypeScript** | UI components, fully typed. | `components/` |
| **Tailwind CSS v4** | Utility CSS. Design tokens are defined in CSS (no JS config). | `app/globals.css` |
| **Drizzle ORM** | Typed SQL. You write a schema in TS; it generates migrations. | `db/` |
| **Postgres (Prisma Postgres)** | The database. | hosted |
| **iron-session** | Cookie-based admin login (one shared password). | `lib/auth.ts` |
| **Zod** | Validates incoming request bodies. | `lib/api.ts` |
| **Vitest** | Unit tests for the scoring engine. | `lib/scoring.test.ts` |
| **Vercel** | Hosting + deploys from the `main` branch. | see `DEPLOY.md` |

There are **no WebSockets** — the public pages just poll the server every few
seconds (simple and reliable for a party).

## 3. Getting started

```bash
npm install
cp .env.local.example .env.local   # then fill in the values (see that file)
npm run dev                        # http://localhost:3000
```

Other commands:

```bash
npm run build        # production build (also the best "did I break the build?" check)
npm run lint         # ESLint
npx tsc --noEmit     # type-check everything
npx vitest run       # run the scoring tests
npx drizzle-kit generate   # create a migration after editing db/schema.ts
npx drizzle-kit migrate    # apply pending migrations to the database
npx tsx scripts/seed.ts    # seed the shared game library (idempotent)
```

Environment variables (full list in `.env.local.example`): `DATABASE_URL`,
`ADMIN_PASSWORD`, `SESSION_SECRET` are required; a few `NEXT_PUBLIC_*` tune
display names and poll intervals.

## 4. The big picture

### How a request flows

- **Public page** (e.g. `/scoreboard`): a *server component* (`app/scoreboard/page.tsx`)
  reads the database once and renders an initial HTML snapshot, then hands a plain
  JSON payload to a *client component* (`ScoreboardView`) that **polls an API**
  (`/api/scoreboard`) every few seconds to stay fresh.
- **Admin action** (e.g. enter a score): a client component calls an **API route**
  (`/api/admin/...`), which validates input, writes to the DB, and returns. The
  page then calls `router.refresh()` to re-pull server data.
- **Scoring**: API routes and pages never do scoring math inline — they call the
  one **pure engine** in `lib/scoring.ts`.

### The three "single sources of truth"

1. **`lib/scoring.ts`** — all points/ranking/tie-break math. Pure functions, zero
   DB calls. If you change scoring rules, you change them here (and nowhere else).
2. **The `years` row** — drives the whole event. Columns like `active_game_id`,
   `display_mode`, `podium_state`, `is_locked`, and `has_started` are the state
   machine for the TV (see §6).
3. **`is_complete` on a game** — only completed games count toward the overall
   leaderboard.

## 5. Directory map

```
app/
  page.tsx                  Landing page (links to everything)
  scoreboard/               Public TV display (1 URL, many modes)
  vote/                     Public costume-ballot booth
  history/                  Museum of past years (read-only)
  admin/
    login/                  Host login
    (panel)/                Auth-guarded admin (layout redirects if not logged in)
      setup/                Create editions; manage teams & games per edition
      library/              The shared, reusable game catalogue
      live/                 Run the event: game control, scoring, fouls, votes
      closing/              "Awards": display modes, podium reveal, finish & lock
  api/
    auth/                   login / logout
    admin/                  All write endpoints (auth-guarded)
    scoreboard/             GET — public TV payload
    vote/                   GET state + POST a ballot (public)

components/
  shared/      The design kit: Panel, Button, Badge, Medal, SectionHeading, ErrorNote,
               TeamDot, Input/Select/inputClass. Restyle once here, not in 9 files.
  admin/       Admin UI; admin/live/* is the live console. GameManager = GameForm +
               SortableGameList; ScoringKindSelect is shared with the library form.
  scoreboard/  The TV screens (Welcome, Split, Podium, Final, Idle, Intermission)
  vote/        VoteBooth
  decor/       Snowfall, StringLights, Confetti, IntermissionScene (eye candy)

lib/           Server + shared logic (see §7)
db/            Drizzle schema + generated migrations
seed-data/     2023/24/25 museum JSON (NOT in the database)
scripts/       seed + small CLI helpers
docs/          Specs and this guide
```

## 6. The TV state machine (very important)

`/scoreboard` is **one URL that never navigates**. What it shows is decided
entirely by the active edition's columns. `ScoreboardView` reads the payload and
picks a screen in this order:

```
no active edition ............................ IdleScreen      ("The Stage Is Set")
active & has_started = false .................. WelcomeScreen   ("Welcome to the <year> Edition", reindeer)
active & has_started & display_mode:
    scoreboard ............................... Split view: StandingsBoard + (NowPlaying | Intermission)
    podium ................................... PodiumStage, driven by podium_state:
        hidden ............................... TallyingScreen ("drumroll")
        show_third → show_second → show_first → show_all  (progressive reveal)
    final_results ............................ FinalResults (full standings)
```

- **`has_started`** flips to `true` the first time the host sets *any* game active
  (in `/api/admin/live/active-game`). It never reverts on its own — so once the
  games begin, the TV won't bounce back to the welcome screen between games. A
  **Rehearsal Reset** sets it back to `false`.
- **`active_game_id`** (FK to `games`, `ON DELETE SET NULL`) is the single "now playing" game. Setting a new one replaces
  the old. When set, the split view's right panel is `NowPlaying`; when null, it's
  the `Intermission` filler.
- **Finish & Lock** (`/api/admin/live/finish`) freezes editing and drops the TV to
  `podium` + `podium_state: hidden` (the drumroll) — deliberately NOT the final
  standings, so the host runs the reveal without spoilers.

The host drives all of this from the **Awards** tab (`components/admin/ClosingControls.tsx`).

## 7. The `lib/` modules

| File | Role | Notes |
|---|---|---|
| `scoring.ts` | **The engine.** `computeLeaderboard`, `computeGameRankings`, `applyTieBreakers`, and `computeStandings` (both in one pass). | Pure. Unit-tested. Change scoring rules here only. Each completed game is ranked once and shared. |
| `scoring-kinds.ts` | Maps the admin's "Count / Timing / Voting" dropdown ↔ stored `score_type`/`score_source`/`score_unit`. | Shared by both game forms. |
| `scoreboard.ts` | `buildScoreboard()` — shapes the public TV JSON payload. | Used by the page (SSR) and `/api/scoreboard`. |
| `live.ts` | `getLiveData()` (one parallel DB pass — five queries, one round trip) + `rankStandings()` (calls `computeStandings`). | Shared by Live, Awards and the TV scoreboard. |
| `voting.ts` | `getVotingState()` + `openVotingGame()` — is voting open, and for whom. | Shared by `/vote` page and API. |
| `years.ts`, `setup.ts` | Server-only DB queries for editions, teams, games, library. | `import 'server-only'`. |
| `historical.ts` | Loads the museum JSON fixtures (display-only). | Past years are NOT recomputed. |
| `auth.ts` | iron-session: `getSession`. | One shared `ADMIN_PASSWORD`. |
| `admin-route.ts` | `adminRoute()` — wraps every admin API handler: 401 if not signed in, and any thrown error comes back as JSON (never an HTML error page). | Pass route params as a type argument: `adminRoute<{ id: string }>(…)`. |
| `guards.ts` | `editableYear / editableGame / editableTeam / editableFoul` — load the row **and** its edition in one query; throw 404 if missing, 423 if the edition is locked. | Every write route that edits edition data goes through one. |
| `schemas.ts` | Shared Zod request-body schemas (games, library, teams, years). Enum values come from `db/schema.ts`. | PATCH schemas are built from default-free fields — see the comment in the file. |
| `api.ts` | `ok()`, `fail()`, `parseBody()` (Zod), `ApiError`, `assertUnlocked()`, `toErrorResponse()`, `isUniqueViolation()` — pure response/error helpers. | No DB or `next/headers` imports, so Vitest can load it. |
| `db.ts`, `db-url.ts` | Drizzle client + resilient connection-string resolution. | See §10. |
| `copy.ts` | Centralized witty copy (idle lines, vote confirmations, the "Naughty List"). | Keep the voice consistent here. |
| `cn.ts` | `cn(...)` — merge Tailwind class strings. | Plain joiner, **not** tailwind-merge: never pass two conflicting utilities (`h-10` + `h-9`); CSS order decides and it's fragile. |
| `view-models.ts` | `TeamVM`, `GameVM`, `LibraryGameVM`, `StandingVM` + their `toXxxVM()` mappers. | The one definition of what the server hands client components. Pure, unit-tested. Never ship host-only fields (e.g. game `instructions`). |
| `hooks/useApi.ts` | Admin mutations: busy/error state, refreshes server data. | `jsonInit(method, body)` builds the request. |
| `hooks/usePolling.ts` | `usePolling(url, ms, initial)` for the TV scoreboard and vote booth. | Keeps last good data, never stacks requests, pauses while the tab is hidden and refreshes on return. |
| `hooks/useAutoRefresh.ts` | `router.refresh()` on an interval for admin panels. | Also pauses while hidden. |

## 8. Data model (the tables)

Defined in `db/schema.ts`. Highlights:

- **`years`** — one row per edition. The TV state machine lives here (`active_game_id`,
  `display_mode`, `podium_state`, `is_locked`, `is_test`, `has_started`).
- **`teams`** — couples (max 16/edition, enforced in the API). `display_color` is theirs.
- **`games`** — `score_type` (high/low wins), `score_source` (manual/voting),
  `num_rounds` (1–2), `round_combine_method` (sum/average), `is_complete`, `sort_order`.
- **`scores`** — one row per (game, team, round). `UNIQUE(game_id, team_id, round)`;
  writes upsert. `raw_score` is numeric (supports decimals → seconds to the hundredth).
- **`party_fouls`** — one row = one −1. We **count rows**, never store a counter.
- **`costume_votes`** — one ballot per voting team: `UNIQUE(year_id, voting_team_id)`;
  re-voting upserts. Points: 1st=10, 2nd=7, 3rd=5.
- **`game_library`** — the shared, reusable catalogue. Pulling a library game into an
  edition copies it; later edits to the library don't touch existing editions.

After editing this file, run `npx drizzle-kit generate` then `npx drizzle-kit migrate`.

## 9. Common tasks (recipes)

**Add a game to the shared library:** Admin → Library → "New Game", or add it to the
`LIBRARY` array in `scripts/seed.ts` and run the seed. The "Scoring" dropdown picks
Count / Timing / Voting (mapped in `lib/scoring-kinds.ts`).

**Change the points table or a tie-breaker:** `lib/scoring.ts` (`PLACEMENT_POINTS`,
`applyTieBreakers`). Then update/extend `lib/scoring.test.ts` and keep it green.

**Change what the TV shows / add a display state:** the switch lives in
`components/scoreboard/ScoreboardView.tsx`; the individual screens are siblings in
`components/scoreboard/`. New persisted states need a `years` column (§6, §8).

**Tweak the score-entry inputs (e.g. timing precision):**
`components/admin/live/ScoreEntry.tsx` (`isTiming`, the `step` attribute).

**Edit witty copy / sayings:** `lib/copy.ts`.

**Add or change an animation:** keyframes go in the `@media (prefers-reduced-motion:
no-preference)` block of `app/globals.css` (so they're accessibility-safe), then use
the `.animate-*` class. ⚠️ See the Turbopack note in §11.

**Change colors / fonts:** the `@theme` block at the top of `app/globals.css`
(e.g. `--color-gold`) and `app/layout.tsx` (font imports).

**Add an admin write endpoint:** copy an existing route under `app/api/admin/`.
Export the handler as `adminRoute(async (req) => { … })`, validate with `parseBody`
+ a schema from `lib/schemas.ts`, call the matching `editable…()` guard if it edits
an edition (that's your lock check), and return via `ok`/`fail`. To bail out with a
specific status from deep inside, `throw new ApiError(status, message)`.

**Add a game-scoring option (new score type/source/round rule):** add the value to
the enum in `db/schema.ts` (then `drizzle-kit generate` + `migrate`); the Zod schemas
pick it up automatically. UI labels live in `lib/scoring-kinds.ts`.

## 10. Testing & verification

- `npx vitest run` proves the engine against the one rule-consistent historical
  year (2023) plus a synthetic suite covering every rule, and asserts the museum
  fixtures are internally consistent. **Keep this green.**
- `npx tsc --noEmit` and `npm run lint` should both be clean before committing.
- `npm run build` is the final "does it really build?" check (catches things dev
  mode hides).

## 11. Conventions & gotchas (read before you're surprised)

- **Decor must be hydration-safe.** `Snowfall`/`Confetti` use a seeded pseudo-random
  (`Math.sin`) rounded to 6 decimals so server and browser render identical inline
  styles. Don't introduce `Math.random()`/`Date.now()` during render.
- **Flex truncation needs `min-w-0`.** A `flex-1 truncate` text node will blow out
  the layout on narrow screens unless it also has `min-w-0`. (We hit this; it's why
  you'll see `min-w-0` on every team-name row.)
- **Animations live under the reduced-motion media query** so they auto-disable for
  users who prefer reduced motion.
- **⚠️ Turbopack dev cache:** editing the *body* of an existing `@keyframes` in
  `globals.css` sometimes isn't hot-reloaded — the browser keeps the old animation.
  Renaming the keyframe forces a fresh one, and **restarting `npm run dev`** always
  clears it. Production builds are always correct.
- **`SESSION_SECRET` is mandatory in production** (32+ chars). `lib/auth.ts` throws
  on admin routes if it's missing or short — the dev fallback is public in the repo.
  The public TV/vote pages keep working; only admin login fails.
- **Older requirements docs live in `docs/archive/`.** The current spec is
  `RV-Reindeer-Games-PRD-v3.md` plus the v3.1 deltas design doc.
- **Admin mutations go through `useApi`** (`lib/hooks/useApi.ts`): one fetch helper with
  busy/error state that always clears, even on a network failure. Don't hand-roll another.
  Panels that must reflect *other people's* actions use `useAutoRefresh`; public pages that
  poll an endpoint (TV, vote booth) use `usePolling`.
- **Server → client data goes through `lib/view-models.ts`.** Add a field there (and to its
  mapper) rather than building ad-hoc objects in a page. Use `TeamDot`, `ErrorNote` and
  `Input`/`Select` from `components/shared/` instead of re-pasting their markup.
- **Score inputs keep unsaved drafts across refreshes.** `ScoreEntry` drops a draft only
  once the server value matches it — don't reset drafts wholesale or the host's typing
  in a neighbouring cell will vanish.
- **⚠️ Local dev and production share one database.** Never set a test year *active*
  locally while a real edition is live — activating one deactivates the other, and the
  public TV scoreboard flips to the test year. Rehearse only when the real edition isn't
  the active one (or after the event).
- **Never print the admin password** in logs/terminal. To test admin pages, mint an
  iron-session cookie from `SESSION_SECRET` instead of typing the password.
- **Museum years are frozen.** `seed-data/*.json` are display-only and intentionally
  preserve each year's original (sometimes inconsistent) scoring. Don't run them
  through the live engine. See `docs/superpowers/specs/...deltas-design.md` §4.

## 12. Deploy & database

Full steps in **`DEPLOY.md`**. In short: production deploys from `main` on Vercel;
local dev and production currently share one Postgres database; **migrations are
applied manually** with `drizzle-kit migrate` (Vercel does not run them). Apply a
migration to the DB before/at merge — old deployed code ignores new columns, so
adding one early is safe.

---

Questions this guide didn't answer? The high-level decisions are recorded in
`CLAUDE.md` and `docs/superpowers/specs/2026-06-13-rv-reindeer-v3.1-deltas-design.md`.
