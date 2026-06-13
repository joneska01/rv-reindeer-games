# Product Requirements Document

## RV Reindeer Games — Live Scoreboard Web App

**Version:** 2.2  
**Date:** May 2026  
**Prepared for:** Developer handoff / Vercel deployment  
**Review:** Incorporates full-stack engineering + solution architecture review + host Q&A

-----

## 1. Overview

### 1.1 Product Summary

The RV Reindeer Games app is a Christmas-themed, real-time scoring and scoreboard web application for an annual holiday party competition. Couples compete in a series of Christmas-themed games each year. The app replaces a manual Excel spreadsheet with:

- A live TV/projector scoreboard with split-view and podium announcement mode
- A public mobile score-entry interface for participants
- A public costume contest voting form (registered teams only)
- A dual admin panel — one view for pre-event setup, one for live event management
- A podium announcement sequence triggered by the admin at event close
- A read-only historical records browser

### 1.2 Core Goals

- **Live scoreboard** on TV/projector: split view (leaderboard + current game), transitions to full-screen podium animation at event close
- **Open score entry** — any participant can enter scores from their phone for the active game
- **Costume Contest voting** — registered teams cast ranked votes (1st/2nd/3rd); votes aggregate into scores automatically
- **Dual admin panel** — Setup Mode for pre-event prep; Live Mode for during-event management
- **Podium announcement** — admin-triggered, step-by-step reveal of 3rd, 2nd, 1st place on the TV
- **Historical records** — read-only view of past years (2023, 2024, 2025 pre-loaded)
- **Game library** — reusable game definitions with instructions, scoring config, and host notes
- **Automatic ranking and points** — all placements and totals computed by a single shared scoring engine

### 1.3 User Roles

|Role            |Access                                      |Auth                            |
|----------------|--------------------------------------------|--------------------------------|
|**Host (Admin)**|Setup Mode + Live Mode admin panels         |Single shared password (env var)|
|**Participant** |Score entry, costume voting, scoreboard view|None — public                   |
|**Room display**|Scoreboard TV view (auto-refreshing)        |None — public                   |

-----

## 2. Tech Stack & Deployment

|Layer     |Choice                                                  |Rationale                                          |
|----------|--------------------------------------------------------|---------------------------------------------------|
|Framework |Next.js 14+ (App Router)                                |Unified frontend + API, Vercel-native              |
|Styling   |Tailwind CSS                                            |Rapid theming, responsive utilities                |
|Database  |Vercel Postgres (Neon-backed)                           |Single vendor, native Vercel integration           |
|Real-time |HTTP polling (8s interval)                              |Sufficient for party use; no WebSocket infra needed|
|Auth      |Custom JWT via `iron-session` or `next-auth` credentials|Lightweight; single-password setup                 |
|Fonts     |Google Fonts via Next.js `next/font`                    |Performance-optimized loading                      |
|Deployment|Vercel (GitHub auto-deploy)                             |                                                   |


> **Architecture note:** Supabase Realtime was considered but adds a second vendor. Vercel Postgres + polling is recommended for v1. The polling abstraction makes a future upgrade to Supabase Realtime a drop-in swap if needed.

### 2.1 Repository Structure

```
/app
  /scoreboard          → TV display (public, auto-polls)
  /enter               → Score entry, mobile-optimized (public)
  /vote                → Costume contest voting (public)
  /history             → Past years, read-only (public)
  /admin
    /setup             → Pre-event configuration (password protected)
    /live              → During-event management (password protected)
  /api
    /scoreboard        → GET — public, edge-cached 5s
    /active-game       → GET — public, current active game info
    /scores            → POST — submit a score (public)
    /votes             → GET/POST — costume votes (public)
    /admin             → All admin mutations (protected)
/components
  /scoreboard          → Leaderboard, GamePanel, PodiumReveal
  /admin               → SetupForms, LiveControls, GameOrderList
  /shared              → Themed UI primitives
/lib
  /db.ts               → Vercel Postgres client
  /scoring.ts          → Pure scoring engine (no DB calls)
  /auth.ts             → Session helpers
  /seed.ts             → Historical data seed script
/public
  /assets              → Snowflake SVGs, light string SVG, icons
```

-----

## 3. Data Model

### 3.1 `Year`

|Field         |Type     |Notes                                                                                                                 |
|--------------|---------|----------------------------------------------------------------------------------------------------------------------|
|id            |UUID     |PK                                                                                                                    |
|year          |Integer  |e.g. 2026. UNIQUE.                                                                                                    |
|is_active     |Boolean  |Only one true at a time. Enforced by app logic.                                                                       |
|is_locked     |Boolean  |True after “Finish Games” is confirmed. Prevents all score writes. Historical years seeded with `true`.               |
|active_game_id|UUID?    |FK → Game (nullable). Single source of truth for which game is active — avoids boolean-per-row race conditions.       |
|podium_state  |Enum     |`hidden` | `show_third` | `show_second` | `show_first` | `show_all`. Default: `hidden`. Drives scoreboard podium mode.|
|created_at    |Timestamp|                                                                                                                      |


> **Engineering note:** `active_game_id` on Year replaces a `Game.is_active` boolean. One atomic update sets the active game rather than toggling two rows.

### 3.2 `Team`

|Field        |Type     |Notes                                   |
|-------------|---------|----------------------------------------|
|id           |UUID     |PK                                      |
|year_id      |UUID     |FK → Year                               |
|name         |String   |e.g. “Murphys”. UNIQUE per year.        |
|display_color|String   |Hex color for scoreboard differentiation|
|party_fouls  |Integer  |Default 0. Admin-only write.            |
|created_at   |Timestamp|                                        |

### 3.3 `PartyFoul`

Party fouls are stored as individual records (not just a counter) so each foul can carry a description for post-game review.

|Field      |Type     |Notes                                                                                   |
|-----------|---------|----------------------------------------------------------------------------------------|
|id         |UUID     |PK                                                                                      |
|team_id    |UUID     |FK → Team                                                                               |
|year_id    |UUID     |FK → Year                                                                               |
|description|String?  |Optional. e.g. “Knocked over opponent’s cup on purpose.” Evidence for post-game debates.|
|assessed_at|Timestamp|When the foul was recorded                                                              |


> The `Team.party_fouls` integer counter is replaced by a `COUNT` of PartyFoul records for that team. This gives the admin a full audit trail and lets them delete a mistakenly recorded foul. The scoring engine counts PartyFoul rows per team when computing totals.

### 3.4 `Game`

|Field               |Type      |Notes                                                                                                                                                    |
|--------------------|----------|---------------------------------------------------------------------------------------------------------------------------------------------------------|
|id                  |UUID      |PK                                                                                                                                                       |
|year_id             |UUID      |FK → Year                                                                                                                                                |
|name                |String    |e.g. “Candy Cane Zipline”                                                                                                                                |
|instructions        |Text      |Full player instructions                                                                                                                                 |
|scoring_description |String    |Short summary shown on score entry form                                                                                                                  |
|score_type          |Enum      |`high_wins` | `low_wins`                                                                                                                                 |
|score_source        |Enum      |`manual` | `voting`. Manual = participants enter raw score. Voting = score derived from CostumeVote aggregation (Costume Contest only).                  |
|score_unit          |String    |e.g. “rings”, “seconds”. Shown as input label.                                                                                                           |
|num_rounds          |Integer   |1 = single score; 2 = two rounds combined                                                                                                                |
|round_combine_method|Enum      |`sum` | `average`. Only relevant if num_rounds > 1.                                                                                                      |
|sort_order          |Integer   |Play order. Admin can reorder at any time including during live event. Scoreboard only reflects order changes when admin explicitly activates a new game.|
|is_complete         |Boolean   |Admin marks complete to lock participant score entry. Default false.                                                                                     |
|completed_at        |Timestamp?|Set when is_complete → true. Audit trail.                                                                                                                |
|library_game_id     |UUID?     |FK → GameLibrary. Nullable — games added from scratch have no library reference.                                                                         |

### 3.5 `Score`

|Field     |Type     |Notes                                                        |
|----------|---------|-------------------------------------------------------------|
|id        |UUID     |PK                                                           |
|game_id   |UUID     |FK → Game                                                    |
|team_id   |UUID     |FK → Team                                                    |
|round     |Integer  |1 or 2. Default 1.                                           |
|raw_score |Decimal  |The actual value — rings caught, seconds elapsed, count, etc.|
|entered_by|String?  |Optional self-reported name of submitter                     |
|created_at|Timestamp|                                                             |
|updated_at|Timestamp|Set on corrections                                           |

**Constraints:**

- `UNIQUE (game_id, team_id, round)` — prevents duplicate score rows. Score submission uses `INSERT ... ON CONFLICT DO UPDATE` (upsert) so re-submitting overwrites rather than stacks.

### 3.6 `CostumeVote`

|Field               |Type     |Notes                                 |
|--------------------|---------|--------------------------------------|
|id                  |UUID     |PK                                    |
|year_id             |UUID     |FK → Year                             |
|voting_team_id      |UUID     |FK → Team. The team casting this vote.|
|first_place_team_id |UUID     |FK → Team                             |
|second_place_team_id|UUID     |FK → Team                             |
|third_place_team_id |UUID     |FK → Team                             |
|created_at          |Timestamp|                                      |
|updated_at          |Timestamp|                                      |

**Rules:**

- `UNIQUE (year_id, voting_team_id)` — one vote per team per year. Re-voting does a full upsert (overwrites all three picks).
- First, second, and third must all be distinct teams. Enforced server-side.
- **Teams may vote for themselves** in any position. This is intentional — the weighted point system (10/7/5) naturally prevents a pure self-voting tie.
- Only teams registered for that year appear in the voting form dropdowns.

**Vote-to-Score Calculation (Costume Contest):**

This is a two-step process the scoring engine handles for `score_source = 'voting'` games:

1. Tally vote points received per team: each 1st-place vote = 10 pts, 2nd-place = 7 pts, 3rd-place = 5 pts
1. Sum vote points per team → this becomes each team’s `combined_score` for the Costume Contest
1. Teams ranked by combined_score (`high_wins`) → assigned placement points (30/28/26…) exactly like any other game

Example: Team A gets 3 first-place votes + 1 second-place vote = (3×10) + (1×7) = 37 vote points → ranked against all other teams’ vote-point totals.

### 3.7 `GameLibrary`

|Field              |Type     |Notes                                               |
|-------------------|---------|----------------------------------------------------|
|id                 |UUID     |PK                                                  |
|name               |String   |Game name                                           |
|instructions       |Text     |Full instructions                                   |
|scoring_description|String   |                                                    |
|score_type         |Enum     |`high_wins` | `low_wins`                            |
|score_source       |Enum     |`manual` | `voting`                                 |
|score_unit         |String   |                                                    |
|default_num_rounds |Integer  |Suggested rounds (overridable when adding to a year)|
|supplies           |Text     |Supply list                                         |
|notes              |Text     |Host notes from past use                            |
|created_at         |Timestamp|                                                    |


> `years_played` is derived at query time by joining Game records via `library_game_id` — no denormalized array that can drift out of sync.

-----

## 4. Scoring Engine

All ranking and point assignment logic lives in `/lib/scoring.ts` as **pure functions with no database calls**. Every view and API route imports from this module, guaranteeing consistency.

```typescript
// Signatures — developer implements these
export function computeLeaderboard(
  games: Game[],
  scores: Score[],
  votes: CostumeVote[],
  teams: Team[],
  partyFouls: PartyFoul[]
): LeaderboardResult

export function computeGameRankings(
  game: Game,
  scores: Score[],
  votes: CostumeVote[],
  teams: Team[]
): GameRankingResult
```

> **Testing requirement:** The scoring engine must be unit-tested against the known 2023, 2024, and 2025 historical results. These serve as test fixtures — if the engine doesn’t reproduce the correct final standings for all three years, it has a bug.

### 4.1 Per-Game Score Resolution

1. If `game.score_source === 'manual'`:
- Collect Score rows for this game
- If `num_rounds = 1`: combined_score = raw_score
- If `num_rounds = 2`: combined_score = sum or average of Round 1 + Round 2 per `round_combine_method`
- **Provisional rankings:** If only Round 1 is submitted for a 2-round game, show rankings based on Round 1 alone, clearly labeled as “Provisional” on the scoreboard until Round 2 is in.
1. If `game.score_source === 'voting'` (Costume Contest):
- Tally CostumeVote rows for this year
- Apply weights: 1st = 10 pts, 2nd = 7 pts, 3rd = 5 pts
- Sum per team → combined_score

### 4.2 Per-Game Ranking

1. Only teams registered for that year are ranked (all are expected to compete in every game)
1. Sort teams by combined_score:
- `high_wins` → descending
- `low_wins` → ascending
1. Teams with no score submitted yet are excluded from ranking and receive 0 placement points for that game until a score is entered
1. **Ties:** Tied teams share the same place and both receive the points for that place. The next distinct score skips the consumed place (e.g., two teams tied 2nd → both get 28 pts; next team is 4th = 24 pts, no 3rd awarded).

### 4.3 Points Table

|Place|Points||Place|Points|
|-----|------||-----|------|
|1st  |30    ||9th  |14    |
|2nd  |28    ||10th |12    |
|3rd  |26    ||11th |10    |
|4th  |24    ||12th |8     |
|5th  |22    ||13th |6     |
|6th  |20    ||14th |4     |
|7th  |18    ||15th |2     |
|8th  |16    ||16th+|1     |

### 4.4 Party Fouls

- Each PartyFoul record = −1 point from that team’s total
- Foul count = `COUNT(PartyFoul WHERE team_id = X AND year_id = Y)`
- `total_points = Σ(placement points across all games) − foul_count`
- Admin can add a foul with an optional description (evidence for post-game debates) and can delete mistakenly recorded fouls

### 4.5 Overall Leaderboard

`total_points = Σ(placement points across all completed games) − party_foul_count`

All registered teams appear on the leaderboard. Teams with no scores yet show 0 points. The leaderboard is a live running total throughout the event — it updates as each game’s scores come in.

-----

## 5. Application Routes & Features

### 5.1 Public: Live Scoreboard — `/scoreboard`

The TV/projector display. No user interaction. Auto-refreshes every 8 seconds.

#### 5.1.1 Normal Mode (split view)

**Layout:** Full-screen, landscape-optimized (1920×1080 target)

- **Left panel (~55%):** Overall Leaderboard
  - Ranked list of all teams: Rank, Team Name, per-game points (compact), Total, Party Fouls
  - Top 3 show 🥇🥈🥉 medal icons
  - Rank changes animate (smooth vertical slide + point count-up) on each poll
  - Scores that just changed highlight briefly in gold
  - Party foul count shown per team (red badge)
- **Right panel (~45%):** Current Game
  - Game name (large, festive typography)
  - Short scoring description
  - Teams ranked by current game score, updating each poll
  - For 2-round games with only Round 1 submitted: clearly labeled “Provisional Rankings”
  - Teams yet to submit shown in a muted “waiting” list below
  - If `score_source = 'voting'`: shows live vote-point totals per team
  - When no game is active: “🎄 Waiting for next game…” festive animation
  - Reordering games in admin does NOT change this panel — only “Set Active” does

**Header:** Event name, year, subtle LED light string SVG with twinkle animation, snowfall CSS background animation

#### 5.1.2 Podium Mode

Replaces the split view entirely. Triggered when `Year.podium_state` changes from `hidden`. The scoreboard polls this value and transitions automatically (≤8s lag from admin button click).

**State machine:**

```
hidden → show_third → show_second → show_first → show_all
```

- **`show_third`:** Dramatic reveal of 3rd place — team name, total points, bronze podium block animation
- **`show_second`:** Silver reveal of 2nd place, slides in alongside 3rd
- **`show_first`:** Gold reveal of 1st place — most elaborate animation, confetti burst, team name in lights
- **`show_all`:** All three displayed. Final celebration state.

If two teams are tied for a podium position, both names are revealed simultaneously on that step (e.g., “🥉 3rd Place (Tied): Murphys & Carvers”).

-----

### 5.2 Public: Score Entry — `/enter`

Mobile-optimized. No auth required.

**Flow:**

1. Page auto-loads active year and active game
1. If no active game: “No game is currently active — check back soon! 🎄”
1. If active game:
- Game name + collapsible full instructions
- Scoring description prominently displayed
- Team selector dropdown (registered teams for this year)
- Score input(s):
  - `num_rounds = 1`: single number field with score_unit label
  - `num_rounds = 2`: two fields labeled “Round 1” and “Round 2” with units
- Optional “Your name” text field
- Submit button
1. On submit: optimistic success shown immediately
- API success: confetti/snowflake animation + “Score submitted! 🎅”
- API failure: “Something went wrong — tap to retry” (no silent failure)
1. Re-submission overwrites prior score (upsert) until game is marked complete
1. If game is complete: “This game is locked. Great job! 🎄” replaces the form

**Validation (client + server):**

- Team must be selected
- Score must be a positive number (decimals allowed)
- Game must not be complete
- Year must not be locked

-----

### 5.3 Public: Costume Contest Voting — `/vote`

Mobile-optimized. No auth. Visible/accessible when a Costume Contest (`score_source = 'voting'`) game exists for the active year.

**Rules confirmed by host:**

- Only registered competing teams may vote (enforced by team dropdown — only that year’s teams appear)
- Teams **may** vote for themselves in any position
- 1st, 2nd, and 3rd picks must be three distinct teams (no repeats)

**Flow:**

1. “Your Team” dropdown — select who is voting (required)
1. “1st Place” dropdown — all teams for this year
1. “2nd Place” dropdown — all teams except the 1st place selection
1. “3rd Place” dropdown — all teams except 1st and 2nd selections (dynamically filtered)
1. Submit → upserts vote record
- First-time vote: “Your votes are in! 🎄”
- Re-vote: “Your votes have been updated!”
1. If year is locked: voting form replaced with “Voting is closed.”

**Server-side validation:**

- voting_team_id must be a registered team for this year
- first, second, third must all be distinct (422 if not)
- Year must not be locked

-----

### 5.4 Admin: Setup Mode — `/admin/setup`

Password-protected. For pre-event configuration — ideally completed before the party starts.

**Auth:** `/admin/login` — single password checked against `ADMIN_PASSWORD` env var. Session cookie valid 24 hours. Same session covers both admin views.

**Year selector** at top of page — all admin actions apply to the selected year.

#### 5.4.1 Year Management

- List all years with status (Active / Locked)
- Create new year: enter year number, optionally copy team list from a prior year
- Set a year as active (deactivates the previous active year)
- Cannot delete a year

#### 5.4.2 Team Management

- Add team: name + color picker
- Edit team name or color
- Remove team (only allowed if no scores exist yet for this year)
- All teams added here are expected to compete in every game — missing scores flagged at event close
- Disabled / read-only if year is locked

#### 5.4.3 Game Configuration

- **Add from Library:** Browse/search GameLibrary → pre-fills all fields → admin can override before saving
- **Add from Scratch:** Blank form
- **Per-game fields:** Name, instructions, scoring description, supplies, score type (high/low), score source (manual/voting), score unit, number of rounds (1 or 2), combine method (sum/average) if 2 rounds
- **Game ordering:** Drag-and-drop list to set `sort_order` (intended play sequence)
- Disabled / read-only if year is locked

#### 5.4.4 Game Library

- Full CRUD on library entries
- Searchable by name
- `years_played` shown as derived count
- Host notes field per game
- Pre-populated from seed (all past games + future ideas)

-----

### 5.5 Admin: Live Event Mode — `/admin/live`

Password-protected (same session as Setup). For use during the party.

Always shows the active year. Cannot switch year context from this view.

#### 5.5.1 Game Control Panel

All games for the active year, displayed in `sort_order` order.

Each row shows:

- Game name, score type, num_rounds
- Status badge: Pending / Active / Complete
- **Set Active** button — sets `Year.active_game_id` to this game (atomic). Disabled if game is already active or complete. Scoreboard right panel updates on next poll.
- **Mark Complete** button — only enabled when game is active. Requires confirmation. Locks participant score entry for this game.
- **Drag handles** for reordering — reordering updates `sort_order` in the admin queue only. Scoreboard right panel does not change until “Set Active” is clicked on a different game.

#### 5.5.2 Score Entry (Admin Override)

Visible when a game is active. Admin can enter or correct scores on behalf of any team.

- Team dropdown + score input(s) per round
- Uses same upsert logic as participant score entry
- Admin can correct scores for complete games (bypasses `is_complete` lock — admin always has override)

#### 5.5.3 Party Foul Tracker

Always visible. List of all teams with:

- Current foul count (derived from PartyFoul record count)
- **”+ Add Foul”** button → opens a small form: optional description field (“Why was this foul assessed?”) → saves a PartyFoul record
- **Foul history list** per team — each recorded foul shown with its description and timestamp, with a delete button for mistakes
- Foul changes reflected in leaderboard totals on next scoreboard poll

#### 5.5.4 Live Leaderboard Preview

Compact leaderboard in the admin view, refreshing every 15 seconds. Lets the host track standings without switching to the TV.

#### 5.5.5 Costume Contest Monitor

Visible when a Costume Contest game exists. Shows:

- Votes submitted out of total teams (e.g., “8 of 10 teams have voted”)
- Per-team vote-point totals, live
- **“Close Voting”** button — marks the Costume Contest game complete, finalizes scores from current votes

#### 5.5.6 End of Event Flow

**Step 1 — “Finish Games” button**

Appears when all non-costume games are marked complete. On click, the app validates:

- Every team registered for this year has a score in every game
- If any scores are missing: lists exactly which team/game combinations are missing. Admin must either:
  - Enter the missing scores directly (score entry fields appear inline), then re-click Finish Games, OR
  - Confirm an override to proceed with missing scores (those teams get 0 points for that game)

On confirmation:

- `Year.is_locked = true` — all participant score entry and voting forms become read-only
- Final leaderboard displayed in admin view
- Podium controls appear

**Step 2 — Podium Reveal Controls**

```
[🥉 Reveal 3rd Place] → [🥈 Reveal 2nd Place] → [🥇 Reveal 1st Place] → [🎉 Show All]
                                                                          [↺ Reset Podium]
```

- Each button updates `Year.podium_state` in DB
- TV scoreboard transitions to Podium Mode on next poll (≤8s)
- Buttons are sequential — each disabled until prior step complete
- **Reset Podium** always available — sets `podium_state = 'hidden'` for rehearsal or redo
- Admin sees the final standings (who is 1st/2nd/3rd) before starting the reveal, so they know what’s coming

-----

### 5.6 Public: History View — `/history`

Read-only. No auth.

- Year selector (all years)
- Final leaderboard for selected year
- Per-game breakdown: game name, team scores, rankings, placement points
- Game instructions for each game played that year
- Party foul log per team (foul count + descriptions)
- Costume Contest vote breakdown
- No edit controls — `is_locked = true` years are fully read-only

-----

## 6. API Routes

|Method|Route                   |Auth |Description                                                                    |
|------|------------------------|-----|-------------------------------------------------------------------------------|
|GET   |`/api/scoreboard`       |None |Full scoreboard: leaderboard, active game scores, podium_state. Edge-cached 5s.|
|GET   |`/api/active-game`      |None |Active game details + current scores/votes                                     |
|POST  |`/api/scores`           |None |Submit/update a score (upsert by game+team+round)                              |
|GET   |`/api/votes`            |None |Current vote tallies for active year’s costume contest                         |
|POST  |`/api/votes`            |None |Submit/update a costume vote (upsert by year+voting_team)                      |
|GET   |`/api/history/:year`    |None |Read-only full data for a past year                                            |
|POST  |`/api/admin/years`      |Admin|Create a new year                                                              |
|PATCH |`/api/admin/years/:id`  |Admin|Update year (active_game_id, podium_state, is_locked, is_active)               |
|POST  |`/api/admin/teams`      |Admin|Add team                                                                       |
|PATCH |`/api/admin/teams/:id`  |Admin|Edit team name, color                                                          |
|DELETE|`/api/admin/teams/:id`  |Admin|Remove team (if no scores exist)                                               |
|POST  |`/api/admin/games`      |Admin|Add game to year                                                               |
|PATCH |`/api/admin/games/:id`  |Admin|Edit game config, sort_order, is_complete                                      |
|DELETE|`/api/admin/games/:id`  |Admin|Remove game (if no scores exist)                                               |
|PATCH |`/api/admin/scores/:id` |Admin|Admin score override (bypasses is_complete lock)                               |
|POST  |`/api/admin/fouls`      |Admin|Add party foul record (with optional description)                              |
|DELETE|`/api/admin/fouls/:id`  |Admin|Delete a foul record                                                           |
|POST  |`/api/admin/library`    |Admin|Add game library entry                                                         |
|PATCH |`/api/admin/library/:id`|Admin|Edit library entry                                                             |

-----

## 7. Design & Theme

### 7.1 Aesthetic Direction

**“Vintage Christmas Carnival”** — rich, warm, festive, and bold. Deep Christmas reds and forest greens, warm gold accents, playful but not childish. The scoreboard should feel like a decorated Christmas party, not a corporate dashboard.

### 7.2 Color Palette

|Role            |Hex      |
|----------------|---------|
|Background dark |`#0D1F0F`|
|Background panel|`#1A3A1C`|
|Primary red     |`#C41E3A`|
|Gold accent     |`#D4AF37`|
|Text primary    |`#F5EDD6`|
|Text secondary  |`#A8C5A0`|
|Silver          |`#C0C0C0`|
|Bronze          |`#CD7F32`|

### 7.3 Typography

- **Display/Headings:** “Mountains of Christmas” (Google Fonts)
- **Body/UI:** “Lora” (Google Fonts)
- **Scores/Numbers:** “DM Mono” — monospace for tabular data

### 7.4 Motion & Decoration

- CSS snowfall animation on scoreboard background (subtle)
- Rank changes: smooth vertical slide + count-up number animation
- Score submission: confetti/snowflake burst on success
- Podium reveal: dramatic CSS animations per step; 1st place gets confetti burst + name-in-lights effect
- LED light string SVG along scoreboard header with twinkle animation
- 🥇🥈🥉 on leaderboard top 3

### 7.5 Responsive Targets

|View          |Primary              |Minimum     |
|--------------|---------------------|------------|
|`/scoreboard` |1920×1080 landscape  |1280×720    |
|`/enter`      |375px mobile portrait|—           |
|`/vote`       |375px mobile portrait|—           |
|`/admin/setup`|1280px desktop       |768px tablet|
|`/admin/live` |1280px desktop       |768px tablet|
|`/history`    |1024px desktop       |768px tablet|

-----

## 8. Real-Time Architecture

**HTTP Polling — recommended for MVP**

|Endpoint          |Poll Interval|Consumers                 |
|------------------|-------------|--------------------------|
|`/api/scoreboard` |8 seconds    |TV scoreboard             |
|`/api/active-game`|10 seconds   |Score entry + voting pages|

- `/api/scoreboard` edge-cached for 5s to handle 20–30 simultaneous connections without DB saturation
- Cache invalidated by admin mutations via `revalidateTag` or by 5s TTL
- `podium_state` included in scoreboard response — scoreboard transitions to Podium Mode when not `hidden`
- Maximum lag from admin action to TV display: ~8s. Acceptable for party use.

-----

## 9. Seed Data

Developer runs `/lib/seed.ts` once (`npx tsx lib/seed.ts`) to populate historical data and game library.

### 9.1 Historical Years (is_locked = true)

#### 2023 — 10 teams, 6 games + Costume Contest

Teams: Buric, Delaney, Hartberg, Hemphill, Huggins, Jones, Lyons, Mears, Murphy, Wahlert

|Team    |Wreath|Rings|Rolo|Shovel|Swing|Costume Pts|Party Fouls|Final    |
|--------|------|-----|----|------|-----|-----------|-----------|---------|
|Delaney |30    |24   |22  |26    |30   |26         |0          |158 (1st)|
|Buric   |26    |24   |30  |30    |18   |30         |−4         |154 (2nd)|
|Wahlert |26    |16   |20  |26    |28   |28         |−1         |143 (3rd)|
|Jones   |14    |24   |28  |26    |26   |22         |0          |140 (4th)|
|Murphy  |28    |16   |24  |28    |26   |14         |0          |136 (5th)|
|Hartberg|26    |30   |16  |26    |20   |16         |−1         |133 (6th)|
|Huggins |12    |28   |26  |26    |22   |14         |−1         |127 (7th)|
|Hemphill|26    |28   |18  |12    |12   |18         |−3         |111 (8th)|
|Lyons   |16    |16   |12  |16    |16   |26         |−2         |100 (9th)|
|Mears   |18    |18   |14  |14    |14   |20         |−2         |96 (10th)|

#### 2024 — 14 teams, 5 games + Costume

#### 2025 — 8 teams, 6 games + Costume

> Full round-level scores for 2024 and 2025 are available in the provided `RV-Reindeer-Games.xlsx` file. Developer should parse this directly for the seed script.

**2024 final totals:** Delaneys 168, Wahlerts 146, Burics 138, Huggins 134, Hemphills 130, Newmans 126, Jones 114, Hagens 112, Hartbergs 108, Reiss 108, Carvers 104, Murphys 100, Lyons 92, Mears 86

**2025 final totals:** Newmans 138, Burics 136, Murphys 132, Hemphills 126, Huggins 122, Jones 120, Carvers 116, Lyons 90

### 9.2 Game Library

|Game                         |Years Played    |Score Type|Source|
|-----------------------------|----------------|----------|------|
|Wreath Toss                  |2023            |high_wins |manual|
|Rolo Stack                   |2023            |high_wins |manual|
|Shovel (spoon/cotton ball)   |2023            |high_wins |manual|
|Ornament Swing               |2023            |high_wins |manual|
|Ring Toss (antler headband)  |2023, 2025      |high_wins |manual|
|Costume Contest              |2023, 2024, 2025|high_wins |voting|
|Cup-Ornament Flip            |2024            |low_wins  |manual|
|Candy Cane Fishing           |2024, 2025      |high_wins |manual|
|Snow Shoveling               |2024            |high_wins |manual|
|Marshmallow Straw            |2024            |high_wins |manual|
|Ping Pong Kleenex Box        |2024            |high_wins |manual|
|Cup Pyramid (balance ball)   |2025            |low_wins  |manual|
|Blowing Snowballs            |2025            |low_wins  |manual|
|Stack the Sack (balloon)     |2025            |low_wins  |manual|
|Candy Cane Zipline           |2025            |low_wins  |manual|
|Ping Pong Hole in Lid        |—               |high_wins |manual|
|Hungry Hippos Reindeer Prance|—               |high_wins |manual|
|Santa’s Scooper              |—               |high_wins |manual|
|Candy Cane Scooping          |—               |high_wins |manual|
|Cup Stacking Contest         |—               |low_wins  |manual|
|Chimney Drop                 |—               |low_wins  |manual|

Full instructions for all 2025 games seeded from `RV-Reindeer-Games-2025.docx`.

-----

## 10. Environment Variables

```env
ADMIN_PASSWORD=your_secret_here
DATABASE_URL=your_vercel_postgres_connection_string
NEXTAUTH_SECRET=random_32_char_string
NEXT_PUBLIC_APP_NAME="RV Reindeer Games"
NEXT_PUBLIC_POLL_INTERVAL_MS=8000
NEXT_PUBLIC_SCOREBOARD_CACHE_SECONDS=5
```

> **Sharing admin access:** Share the `ADMIN_PASSWORD` value with any co-host. To rotate the password, update it in Vercel Dashboard → Settings → Environment Variables and redeploy. Existing 24-hour session cookies remain valid until they expire naturally.

-----

## 11. Non-Functional Requirements

|Requirement                 |Target                                                   |
|----------------------------|---------------------------------------------------------|
|Scoreboard refresh lag      |≤ 10s for score changes to appear on TV                  |
|Podium reveal lag           |≤ 10s from admin button click to TV update               |
|Mobile score/vote load time |< 2s on 4G                                               |
|Concurrent connections      |30 simultaneous users without degradation                |
|Data persistence            |Postgres — survives restarts and cold starts             |
|Admin session               |24-hour cookie                                           |
|Score submission reliability|Optimistic UI + retry on failure; no silent data loss    |
|DB write safety             |Upserts for scores and votes — no duplicate rows possible|

-----

## 12. Test Mode

The host needs to fully test all features end-to-end — including setup, live scoring, costume voting, the scoreboard display, and the podium sequence — before the real event. Test data must be cleanly separable from real historical data and permanently deletable.

### 12.1 Approach: Test Year Flag

The simplest and safest implementation. A Year record carries an `is_test = true` flag. All data hanging off a test year (teams, games, scores, votes, party fouls) is scoped to that year and inherits its test status implicitly.

Add to the `Year` data model:

|Field  |Type   |Notes                                                         |
|-------|-------|--------------------------------------------------------------|
|is_test|Boolean|Default false. Marks this year and all its data as a test run.|

**Behavior:**

- Test years are **visually distinct** everywhere in the admin — a prominent “TEST” badge on the year label, yellow/amber border on admin panels, and a persistent banner: “⚠️ Test Mode — this data will not appear in history.”
- Test years are **excluded from the public History view** by default. An optional “Show test years” toggle in History can reveal them for the admin to review test results, but they are hidden from normal browsing.
- Test years **do not affect** the game library — games added from library to a test year don’t update `years_played` counts.
- The scoreboard, score entry, voting, and podium all function identically during a test year — the full feature surface is exercisable.
- Party fouls assessed during a test year are scoped to that year and deleted with it.

### 12.2 Test Year Creation

In Admin Setup Mode, when creating a new year, a checkbox: **“This is a test run”** sets `is_test = true`. The year number can be anything — the host can use a fake year (e.g., 9999) or the real upcoming year. Using a fake year number avoids collision with the real event year when it’s created later.

Recommended test workflow:

1. Create a test year (e.g., year = 9999, is_test = true)
1. Add fake teams (e.g., “Test Team A”, “Test Team B”, etc.)
1. Add games from the library (or scratch)
1. Open scoreboard on TV
1. Walk through the full live event flow: activate games, submit scores from phones, track fouls, run costume voting, close event, trigger podium
1. Validate everything looks and behaves correctly
1. Delete the test year when satisfied

### 12.3 Deleting a Test Year

A **“Delete Test Year”** button appears in Admin Setup Mode on any year where `is_test = true`. It does not appear on real years — production data cannot be bulk-deleted.

On click:

- Confirmation dialog: “This will permanently delete [Year 9999] and all its teams, games, scores, votes, and fouls. This cannot be undone.”
- On confirm: cascading delete of all records associated with that year_id
- The year is removed from all admin views

Real years (`is_test = false`) — including historical seeded years — have no delete option. They can only be locked/unlocked.

### 12.4 Partial Re-Testing

If the host wants to re-test a specific part of the flow without deleting everything:

- **Reset scores for a game:** Admin can delete all scores for a specific game within a test year (a “Clear Scores” button per game, only visible on test years)
- **Reset votes:** A “Clear All Votes” button on the Costume Contest monitor, only visible on test years
- **Reset podium:** The existing Reset Podium button already handles this
- **Unlock a test year:** If the year was locked via “Finish Games,” a “Unlock Year” button (test years only) resets `is_locked = false` and `podium_state = 'hidden'` so the end-of-event flow can be re-tested from scratch

### 12.5 What Cannot Be Tested in Isolation

The game library and historical data are shared globals — they are not affected by test years at all. Any changes made to the game library during testing (adding, editing, deleting library entries) are real and permanent. The host should be aware of this and avoid editing library entries during a test run unless intentional.

-----

## 13. Out of Scope (v1.0)

- Individual participant user accounts
- Push notifications / SMS
- Native mobile app
- WebSocket / Supabase Realtime
- Custom domain (configurable post-deploy in Vercel)
- Costume photo uploads
- Email recap after event

-----

## 14. Suggested Build Order

1. **DB schema + seed script** — schema with `is_test` flag, constraints, seed historical data, verify totals match known results
1. **Scoring engine** (`/lib/scoring.ts`) — pure functions, unit-tested against 2023/2024/2025 fixtures
1. **Admin Setup Mode** — year, team, game, library management; test year creation and deletion
1. **Score Entry page** (`/enter`) — mobile-optimized
1. **Costume Voting page** (`/vote`) — voting form + upsert + live vote display
1. **Scoreboard TV view** (`/scoreboard`) — split layout, polling, animations
1. **Admin Live Mode** — game controls, party foul tracker, score overrides, costume monitor; test-year-only reset controls
1. **End of Event flow** — Finish Games validation + podium controls; unlock for test years
1. **Podium Mode** on scoreboard — state machine, reveal animations
1. **History View** (`/history`) — read-only, test years hidden by default
1. **Polish** — Christmas theming, snowfall, LED lights, responsive tweaks
1. **Deploy** — Vercel project, env vars, Postgres, run seed script

-----

## 14. Acceptance Criteria

### Setup

- [ ] Admin can create a new year and set it as active
- [ ] Admin can add/edit/remove teams for the active year
- [ ] Admin can add games from library or scratch with all config options
- [ ] Admin can set play order via drag-and-drop
- [ ] Admin can browse, search, and edit the game library

### Live Event

- [ ] Admin can set one game as active (atomic — previous active game deactivated)
- [ ] Admin can reorder games without affecting the currently displayed scoreboard panel
- [ ] Scoreboard right panel only changes when “Set Active” is clicked
- [ ] Admin can mark a game complete (locks participant score entry for that game)
- [ ] Admin can enter/override any score for any team, including for complete games
- [ ] Admin can add party fouls with optional descriptions and delete mistaken fouls
- [ ] Admin can monitor costume contest vote progress in real time

### Score Entry

- [ ] Participant sees active game and can submit from mobile
- [ ] Optimistic UI with clear success and retry-on-failure states
- [ ] Re-submission overwrites prior score (upsert)
- [ ] Entry locked when game complete or year locked

### Costume Contest Voting

- [ ] Only registered teams appear in the voting team dropdown
- [ ] Teams may vote for themselves
- [ ] 1st/2nd/3rd must be three distinct teams (client + server enforced)
- [ ] Re-voting overwrites prior vote
- [ ] Vote-to-score: 1st=10, 2nd=7, 3rd=5 points per receiving team; summed and ranked

### Scoring Engine

- [ ] Reproduces correct 2023, 2024, 2025 final standings (used as test fixtures)
- [ ] Ties handled correctly: both teams get higher-place points, next team skips a place
- [ ] `high_wins` and `low_wins` rank correctly
- [ ] Multi-round games combine by sum or average correctly
- [ ] Provisional rankings shown after Round 1 of a 2-round game, labeled “Provisional”
- [ ] Party foul records count correctly and deduct from totals
- [ ] Costume Contest derives scores from votes, not manual entry

### Scoreboard (TV)

- [ ] Split view: leaderboard left, current game right
- [ ] Auto-refreshes every 8 seconds
- [ ] Rank changes animate smoothly
- [ ] “No active game” state displays gracefully
- [ ] Right panel only updates when admin activates a new game (not on reorder)
- [ ] Transitions to Podium Mode when podium_state changes

### Podium

- [ ] Admin advances 3rd → 2nd → 1st → All in sequence
- [ ] Each step triggers distinctive animation on TV
- [ ] Admin sees final standings before starting reveal
- [ ] Tied podium positions show both teams simultaneously
- [ ] Reset Podium returns to hidden state
- [ ] TV lag ≤ 10 seconds from admin click

### End of Event

- [ ] “Finish Games” flags every missing team/game score combination
- [ ] Admin can fill missing scores inline or override to proceed
- [ ] Year locks after confirmation — all public forms become read-only
- [ ] Podium controls appear after lock

### History

- [ ] 2023, 2024, 2025 data viewable with correct totals
- [ ] Party foul descriptions visible in history
- [ ] No edit controls on locked years
- [ ] Test years hidden from History view by default

### Test Mode

- [ ] Admin can create a year flagged as `is_test = true` using a checkbox at creation time
- [ ] Test years display a persistent “TEST” badge and amber visual treatment in all admin views
- [ ] Full feature surface works identically during a test year: score entry, voting, scoreboard, podium
- [ ] Test years are excluded from the public History view by default
- [ ] “Delete Test Year” button appears on test years only — permanently cascades all related data
- [ ] Delete confirmation dialog clearly warns the action is irreversible
- [ ] Real years (is_test = false) have no delete option
- [ ] “Clear Scores” per game available on test years only
- [ ] “Clear All Votes” available on test years only
- [ ] “Unlock Year” resets is_locked and podium_state on test years, allowing end-of-event flow to be re-tested
- [ ] Game library entries are unaffected by test year creation or deletion

### General

- [ ] Christmas theme consistent across all views
- [ ] Deployed and accessible via public Vercel URL
- [ ] All env variables documented and functional

-----

*End of PRD — RV Reindeer Games v2.2*