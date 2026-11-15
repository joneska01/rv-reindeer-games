# RV Reindeer Games — CLAUDE.md

Christmas-themed live scoring web app for an annual holiday party. Couples compete in games; a TV/projector shows a live scoreboard. Built with Next.js 16 App Router, Drizzle ORM, and Prisma Postgres (via the Vercel Marketplace). Theme is "cheeky but classy" — an elegant holiday cocktail party, geared toward adults. See `docs/superpowers/specs/2026-06-13-rv-reindeer-v3.1-deltas-design.md` for decisions that refine PRD v3.

## Essential Commands

```bash
npm run dev           # Start development server (localhost:3000)
npm run build         # Production build
npm run lint          # ESLint
npx drizzle-kit generate   # Generate migration from schema changes
npx drizzle-kit migrate    # Apply pending migrations
npx tsx scripts/seed.ts    # Seed shared game library, idempotent (NOT historical years)
npx vitest                 # Run unit tests (scoring engine + museum fixtures)
```

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `ADMIN_PASSWORD` | Yes | Single password for admin panel |
| `SESSION_SECRET` | Yes | 32+ char string for iron-session encryption |
| `NEXT_PUBLIC_APP_NAME` | No | Display name (default: "RV Reindeer Games") |
| `NEXT_PUBLIC_POLL_INTERVAL_MS` | No | Scoreboard poll interval in ms (default: 8000) |

## Key Architecture Decisions

- **Single scoring engine** at `/lib/scoring.ts` — pure functions, zero DB calls. All API routes and components import from here. Never duplicate scoring logic.
- **`active_game_id` on the Year row** is the single source of truth for which game is active. Setting a new active game must atomically clear the previous one.
- **Only completed games** (`is_complete = true`) contribute to the overall leaderboard. The active game's scores appear only in the right panel.
- **HTTP polling** — scoreboard polls every 8s, votes every 10s. No WebSockets.
- **`/scoreboard` never navigates** — all three display modes (split view, podium, final results) render at this single URL, driven by `Year.display_mode`.

## Scoring Engine Contract (`/lib/scoring.ts`)

```typescript
computeLeaderboard(games, scores, votes, teams, partyFouls): LeaderboardResult
computeGameRankings(game, scores, votes, teams): GameRankingResult
applyTieBreakers(teams, leaderboard, games, scores, votes): RankedTeam[]
```

Points table: 1st=30, 2nd=28, 3rd=26, 4th=24 … 16th+=1. Tied teams share the higher place; next distinct score skips consumed places.

Party fouls: each `PartyFoul` row = −1 from team total. Count rows, don't use a stored counter.

Costume Contest tie-breaker: excluded from step 1 (game wins) but included in step 2 (top-3 finishes).

## Database Schema Summary

- `years` — `display_mode` + `podium_state` drive the TV display
- `teams` — max 16 per year (API-enforced)
- `games` — `score_type` (high/low), `score_source` (manual/voting), `num_rounds`, `round_combine_method`
- `scores` — UNIQUE(game_id, team_id, round); upsert on write
- `party_fouls` — individual records, not a counter
- `costume_votes` — UNIQUE(year_id, voting_team_id); upsert on re-vote
- `game_library` — shared global; test year deletion does not affect it

## Test Mode

Test years have `is_test = true`. They show an amber warning badge everywhere in admin and are excluded from the public `/history` view. Use year number 9999 for test runs to avoid colliding with real event years.

## Seed Data

Historical years are **museum fixtures** in `/seed-data/2023.json`, `2024.json`, `2025.json` — display-only, served straight from JSON via `lib/historical.ts`, **not** seeded into the DB and **not** recomputed by the live engine. The original spreadsheet (removed; see git history) scored each year with different/inconsistent rules (2024 ignored fouls; 2025 dropped a game + scored costume ad-hoc), so totals are preserved verbatim. Each game carries `counted`; each foul carries `applied`. See the v3.1 design doc §4.

**Engine verification:** `lib/scoring.test.ts` proves the live engine against **2023** (the one rule-consistent year reproduces documented standings exactly) plus a synthetic suite covering every rule, and asserts museum-fixture integrity for all three years. Keep this green before building scoreboard/admin UI.
