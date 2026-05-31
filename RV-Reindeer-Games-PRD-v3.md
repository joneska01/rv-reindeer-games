# Product Requirements Document
## RV Reindeer Games — Live Scoreboard Web App

**Version:** 3.0
**Date:** May 2026
**Prepared for:** Senior Full-Stack Developer — ready for implementation
**Review history:** v2.2 host Q&A + v2.3 UI/UX & architecture review + v3 host confirmation

---

## 1. Overview

### 1.1 Product Summary

The RV Reindeer Games app is a Christmas-themed, real-time scoring and scoreboard web application for an annual holiday party competition. Couples compete in a series of Christmas-themed games each year. The app replaces a manual Excel spreadsheet with:

- A live TV/projector scoreboard with split-view, podium announcement, and final results modes — all on a single URL, no browser navigation required during the event
- A public costume contest voting form (registered teams only)
- A dual admin panel — Setup Mode for pre-event configuration, Live Mode for during-event management
- A step-by-step podium reveal sequence followed by a detailed final results display
- A read-only historical records browser
- A full test mode for end-to-end rehearsal before the real event

### 1.2 Core Goals

- **Live scoreboard** on TV/projector: split view (overall leaderboard + current game panel), transitioning through podium reveal and into final results — all within `/scoreboard`, no URL changes needed
- **Costume Contest voting** — registered teams cast ranked votes (1st/2nd/3rd) from their phones; votes aggregate into scores automatically
- **Dual admin panel** — Setup Mode for pre-event prep; Live Mode for during-event management including all score entry
- **Podium announcement** — admin-triggered step-by-step reveal of 3rd, 2nd, 1st place, followed by final results
- **Historical records** — read-only view of past years (2023, 2024, 2025 pre-loaded)
- **Game library** — reusable game definitions with instructions, scoring config, and host notes
- **Automatic ranking and points** — all placements and totals computed by a single shared scoring engine
- **Test mode** — full feature rehearsal with isolated, deletable test data

### 1.3 User Roles

| Role | Access | Auth |
|---|---|---|
| **Host / Admin** | Setup Mode + Live Mode admin panels | Single shared password (env var) |
| **Participant** | Costume voting, scoreboard view, final results | None — public |
| **Room display** | `/scoreboard` — auto-refreshing, never needs navigation | None — public |

> **Note:** Scores are entered exclusively by the admin in Live Mode. There is no public score entry interface.

---

## 2. Tech Stack & Deployment

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js 14+ (App Router) | Unified frontend + API, Vercel-native |
| Styling | Tailwind CSS | Rapid theming, responsive utilities |
| Database | Vercel Postgres (Neon-backed) | Single vendor, native Vercel integration |
| ORM | Drizzle ORM | Type-safe, migration-friendly, Vercel Postgres compatible |
| Real-time | HTTP polling (8s interval) | Sufficient for party use; no WebSocket infra needed |
| Auth | `iron-session` or `next-auth` credentials | Lightweight; single-password setup |
| Fonts | Google Fonts via Next.js `next/font` | Performance-optimized loading |
| Logging | Vercel Logs | No dedicated error monitoring required for v1 |
| Deployment | Vercel (GitHub auto-deploy) | |

> **Architecture note:** Multiple concurrent admin sessions are supported. No session invalidation occurs when a second admin logs in. Concurrent mutations follow last-write-wins — not a practical risk at a party with one or two hosts, but documented for clarity.

### 2.1 Repository Structure

```
/app
  /scoreboard          → TV display — all modes render here (public, auto-polls)
  /vote                → Costume contest voting, mobile-optimized (public)
  /final-results       → Detailed final results, public after year lock
  /history             → Past years, read-only (public)
  /admin
    /setup             → Pre-event configuration (password protected)
    /live              → During-event management (password protected)
    /login             → Admin auth page
  /api
    /scoreboard        → GET — public, edge-cached 5s
    /votes             → GET/POST — costume votes (public)
    /admin             → All admin mutations (protected)
/components
  /scoreboard          → Leaderboard, GamePanel, PodiumReveal, FinalResults
  /admin               → SetupForms, LiveControls, GameOrderList, ScoreEntry
  /shared              → Themed UI primitives
/lib
  /db.ts               → Drizzle client + Vercel Postgres connection
  /scoring.ts          → Pure scoring engine (no DB calls)
  /auth.ts             → Session helpers
/db
  /schema.ts           → Drizzle schema definitions
  /migrations/         → Drizzle migration files
/seed-data
  /2023.json           → Historical seed fixture
  /2024.json           → Historical seed fixture
  /2025.json           → Historical seed fixture
/scripts
  /seed.ts             → Seed runner (npx tsx scripts/seed.ts)
/public
  /assets              → Snowflake SVGs, light string SVG, icons
```

---

## 3. Data Model

All schema defined via Drizzle ORM in `/db/schema.ts`. Migrations managed via Drizzle Kit.

### 3.1 `Year`

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| year | Integer | e.g. 2026. UNIQUE. |
| is_active | Boolean | Only one `true` at a time. Enforced by app logic on mutation. |
| is_locked | Boolean | `true` after "Finish Games" confirmed. Prevents all score/vote writes. Historical years seeded as `true`. |
| is_test | Boolean | `true` for test runs. Excludes year from public History view. Enables destructive reset controls in admin. |
| active_game_id | UUID? | FK → Game (nullable). Single source of truth for the active game — avoids boolean-per-row race conditions. Must reference a game belonging to this year. |
| display_mode | Enum | `scoreboard` \| `podium` \| `final_results`. Default: `scoreboard`. Top-level switch controlling what `/scoreboard` renders. |
| podium_state | Enum | `hidden` \| `show_third` \| `show_second` \| `show_first` \| `show_all`. Default: `hidden`. Sub-state for the podium reveal sequence. Only relevant when `display_mode = 'podium'`. |
| created_at | Timestamp | |

> **State machine:** `display_mode` is the top-level TV mode switch. `podium_state` tracks which step within the podium reveal. When `display_mode` changes to `final_results`, the `/scoreboard` page renders the Final Results layout. The TV browser never needs to navigate to a different URL.

### 3.2 `Team`

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| year_id | UUID | FK → Year |
| name | String | e.g. "Murphys". UNIQUE per year. |
| display_color | String | Hex color for scoreboard differentiation |
| created_at | Timestamp | |

**Constraint:** Maximum 16 teams per year. Enforced at API level on team creation.

### 3.3 `PartyFoul`

Individual records per foul — not a counter — so each foul carries a description and can be individually deleted.

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| team_id | UUID | FK → Team |
| year_id | UUID | FK → Year |
| description | String? | Optional. Evidence for post-game debates. e.g. "Knocked over opponent's cup." |
| assessed_at | Timestamp | |

> Party foul count per team = `COUNT(PartyFoul WHERE team_id = X AND year_id = Y)`. Each foul = −1 point from team total. The scoring engine counts rows, not a stored integer.

### 3.4 `Game`

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| year_id | UUID | FK → Year |
| name | String | e.g. "Candy Cane Zipline" |
| instructions | Text | Full player instructions |
| scoring_description | String | Short summary shown in admin score entry panel |
| score_type | Enum | `high_wins` \| `low_wins` |
| score_source | Enum | `manual` \| `voting`. Manual = admin enters raw scores. Voting = scores derived from CostumeVote aggregation (Costume Contest only). |
| score_unit | String | e.g. "rings", "seconds". Label shown next to score inputs. |
| num_rounds | Integer | 1 = single score; 2 = two rounds combined |
| round_combine_method | Enum | `sum` \| `average`. Only relevant if `num_rounds = 2`. |
| sort_order | Integer | Admin-controlled play order. Reordering in admin does not affect the TV display until admin explicitly sets a new active game. |
| is_complete | Boolean | Admin marks complete to finalize scores. Default `false`. |
| completed_at | Timestamp? | Set when `is_complete` flips to `true`. Audit trail. |
| library_game_id | UUID? | FK → GameLibrary. Nullable for games added from scratch. |

### 3.5 `Score`

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| game_id | UUID | FK → Game |
| team_id | UUID | FK → Team |
| round | Integer | 1 or 2. Default 1. |
| raw_score | Decimal | The actual value — rings caught, seconds elapsed, count, etc. |
| created_at | Timestamp | |
| updated_at | Timestamp | Set on corrections |

**Constraint:** `UNIQUE (game_id, team_id, round)`. Score submission uses upsert (`INSERT ... ON CONFLICT DO UPDATE`) — re-entry overwrites, never stacks.

### 3.6 `CostumeVote`

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| year_id | UUID | FK → Year |
| voting_team_id | UUID | FK → Team. The team casting this vote. |
| first_place_team_id | UUID | FK → Team |
| second_place_team_id | UUID | FK → Team |
| third_place_team_id | UUID | FK → Team |
| created_at | Timestamp | |
| updated_at | Timestamp | |

**Constraints:**
- `UNIQUE (year_id, voting_team_id)` — one vote record per team per year. Re-voting upserts (overwrites all three picks).
- First, second, and third must all be distinct teams. Enforced server-side (422 if violated).
- Teams **may** vote for themselves in any position. The weighted point system (10/7/5) naturally prevents pure self-voting ties.
- Only teams registered for that year appear in the voting form dropdowns.

**Vote-to-Score Calculation:**

Two-step process handled by the scoring engine for `score_source = 'voting'` games:

1. Tally vote points per team: 1st-place vote = 10 pts, 2nd-place = 7 pts, 3rd-place = 5 pts. Sum all received votes per team → `combined_score`.
2. Rank teams by `combined_score` (`high_wins`) → assign placement points (30/28/26...) exactly like any other game.

Example: Team A receives 3 first-place votes + 1 second-place vote = (3×10) + (1×7) = 37 vote points. This 37 is their raw score for ranking purposes.

In the Final Results table, the Costume Contest raw score column shows each team's vote-point total (e.g., 37).

### 3.7 `GameLibrary`

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| name | String | Game name |
| instructions | Text | Full instructions |
| scoring_description | String | |
| score_type | Enum | `high_wins` \| `low_wins` |
| score_source | Enum | `manual` \| `voting` |
| score_unit | String | |
| default_num_rounds | Integer | Suggested rounds (overridable when adding to a year) |
| supplies | Text | Supply list |
| notes | Text | Host notes from past use |
| created_at | Timestamp | |

> `years_played` is derived at query time via `JOIN Game ON library_game_id`. No denormalized array — avoids drift. Game library is a shared global; test years do not affect it.

---

## 4. Scoring Engine

All logic lives in `/lib/scoring.ts` as **pure functions with zero database calls**. Every API route and component imports from this module — one implementation, consistent everywhere.

```typescript
// Required exports
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

export function applyTieBreakers(
  teams: Team[],
  leaderboard: LeaderboardResult,
  games: Game[],
  scores: Score[],
  votes: CostumeVote[]
): RankedTeam[]
```

> **Testing requirement:** The scoring engine must be unit-tested against 2023, 2024, and 2025 historical data as fixtures. If the engine does not reproduce the correct final standings for all three years, it has a bug. Fix before building any UI.

### 4.1 Per-Game Score Resolution

**Manual games (`score_source = 'manual'`):**
- `num_rounds = 1`: combined_score = raw_score for round 1
- `num_rounds = 2`: combined_score = sum or average of round 1 + round 2 per `round_combine_method`
- If only round 1 exists for a 2-round game: provisional combined_score = round 1 score. Shown as "Provisional" in the right panel. Does NOT contribute to the overall leaderboard until game is marked complete.

**Voting games (`score_source = 'voting'`, Costume Contest):**
- Sum vote points received per team (1st=10, 2nd=7, 3rd=5) → combined_score
- Ranked `high_wins`

### 4.2 Overall Leaderboard Computation

**Only completed games (`is_complete = true`) contribute to the overall leaderboard.** The active game's scores appear only in the right panel (current game view) and do not affect left-panel standings until the admin marks the game complete. This keeps the leaderboard stable and unambiguous during play.

### 4.3 Per-Game Ranking

1. Sort teams by combined_score per `score_type`
2. Teams with no score for a game are excluded from that game's ranking and receive 0 placement points for it
3. **Ties:** Tied teams share the same place and both receive the points for that place. The next distinct score skips the consumed place number (e.g., two teams tied 2nd → both get 28 pts; next team is 4th = 24 pts, skipping 3rd)

### 4.4 Points Table

| Place | Points | | Place | Points |
|---|---|---|---|---|
| 1st | 30 | | 9th | 14 |
| 2nd | 28 | | 10th | 12 |
| 3rd | 26 | | 11th | 10 |
| 4th | 24 | | 12th | 8 |
| 5th | 22 | | 13th | 6 |
| 6th | 20 | | 14th | 4 |
| 7th | 18 | | 15th | 2 |
| 8th | 16 | | 16th+ | 1 |

### 4.5 Party Fouls

- Each `PartyFoul` record = −1 point from that team's final total
- `total_points = Σ(placement points across all completed games) − COUNT(PartyFoul for this team)`

### 4.6 Overall Event Tie-Breakers

Applied whenever two or more teams are tied on total points. Used consistently for the leaderboard, podium reveal order, final results display, and history view.

**Tie-break sequence:**

1. **Most game wins** — count of 1st-place finishes across completed games. Costume Contest is **excluded** from this count (non-skill game).
2. **Most top-3 finishes** — count of 1st, 2nd, or 3rd place finishes across completed games (Costume Contest included here).
3. **Fewest party fouls** — lower foul count wins.
4. **Higher placement in the final completed game** — whichever team ranked better in the last game marked complete wins. If the two teams are also tied in that game, fall through to step 5.
5. **Manual admin resolution** — the app flags the unresolved tie and the podium reveal pauses. The admin resolves verbally at the party. The TV display shows a "Tie — awaiting resolution" state and holds until the admin manually advances the podium.

> **UI for step 5:** No dropdown or forced pick in the app. The podium reveal simply holds at the tied position with a visible "Tie detected — resolve manually, then advance" message in the admin Live panel. The admin announces the winner verbally, then clicks "Advance" to proceed.

---

## 5. Application Routes & Features

### 5.1 Public: Live Scoreboard — `/scoreboard`

The TV/projector display. **Never needs to navigate to a different URL during the event.** All three display modes render at this single route. Auto-polls `/api/scoreboard` every 8 seconds, checks `display_mode` on each poll, and renders the appropriate layout.

#### 5.1.1 Mode: `scoreboard` (Split View — default)

**Layout:** Full-screen landscape, optimized for 1920×1080, minimum 1280×720. Target viewing distance: 10–15 feet. All text sized accordingly (rank numbers and point totals minimum ~48px equivalent).

**Left panel (~55%) — Overall Leaderboard:**

| Column | Notes |
|---|---|
| Rank | With 🥇🥈🥉 for top 3 |
| Team Name | In team display color |
| Total Points | Sum of completed games minus fouls |
| Party Fouls | Count shown as red badge |
| Games Completed | "X / Y" format (Y = total games for the year, including Costume Contest) |

- Only completed games contribute to Total Points
- Rank changes animate smoothly (vertical slide + count-up) on each poll refresh
- Scores that changed since last poll briefly highlight in gold

**Right panel (~45%) — Current Game:**
- Game name (large, festive)
- Scoring description
- Live ranking within this game as scores are entered, sorted by current rank
- Raw scores shown alongside rank
- For 2-round games with only round 1 in: labeled "Provisional Rankings"
- Teams awaiting scores shown in a muted "waiting" list below ranked teams
- When `active_game_id` is null: "🎄 Waiting for next game..." festive idle state

**Background:** Subtle CSS snowfall animation. Red/green LED light string SVG along header with twinkle animation. Landscape only — no mobile layout for this view.

#### 5.1.2 Mode: `podium` (Podium Reveal)

Replaces split view entirely. Triggered when admin sets `display_mode = 'podium'`.

The podium reveal is a sub-state machine driven by `podium_state`:

| podium_state | TV shows |
|---|---|
| `hidden` | (not in podium mode yet — this state only exists before admin starts reveal) |
| `show_third` | 3rd place team name + total points revealed with bronze animation |
| `show_second` | 2nd place slides in alongside 3rd, silver treatment |
| `show_first` | 1st place revealed — most elaborate: confetti burst, gold glow, name-in-lights effect |
| `show_all` | All three displayed simultaneously. Hold state. |

- Tied podium positions: both team names revealed simultaneously at that step (e.g., "🥉 3rd Place — Murphys & Carvers")
- If a tie reaches Step 5 (manual resolution): `show_third` (or whichever step) displays "🎄 Tie — Stand by..." and holds until admin manually advances
- Admin sees final standings in Live panel before starting the reveal so there are no surprises

#### 5.1.3 Mode: `final_results`

Replaces podium view. Triggered after podium reveal is complete when admin clicks "Show Final Results." The TV continues showing `/scoreboard` — no navigation.

**Layout — two sections:**

**Podium Summary (top):** Static display of 1st, 2nd, 3rd place — team names and final point totals. Compact version of the podium for persistent context.

**Detailed Results Table (below):** Full scrollable breakdown.

| Column | Notes |
|---|---|
| Rank | Final overall rank |
| Team | Team name |
| [Game 1 name] ... [Game N name] | Raw score for each game (vote-points total for Costume Contest) |
| Party Fouls | Count |
| Final Total | Grand total points |

- All teams shown, all games as columns
- Publicly accessible at `/final-results` once `is_locked = true` — participants can pull it up on their phones
- Also rendered directly within `/scoreboard` when `display_mode = 'final_results'`

---

### 5.2 Public: Final Results — `/final-results`

A standalone public page rendering the same Final Results layout as the `final_results` scoreboard mode.

- Accessible to anyone once the year is locked (`is_locked = true`)
- Mobile-friendly layout (unlike `/scoreboard` which is landscape/TV only)
- Participants can bookmark or share this URL after the event
- Shows the active year's results by default; year selector available to browse past years

---

### 5.3 Public: Costume Contest Voting — `/vote`

Mobile-optimized. No auth. Accessible when a Costume Contest (`score_source = 'voting'`) game exists for the active year and the year is not locked.

**Voting rules:**
- Only registered competing teams may vote (enforced by dropdown — only that year's teams appear)
- Teams **may** vote for themselves in any position
- 1st, 2nd, and 3rd picks must be three distinct teams — enforced client-side and server-side (422 if violated)

**Flow:**
1. "Your Team" dropdown — required
2. "1st Place" dropdown — all teams
3. "2nd Place" dropdown — all teams except 1st selection (dynamically filtered)
4. "3rd Place" dropdown — all teams except 1st and 2nd (dynamically filtered)
5. Submit → upserts vote record
   - First vote: "Your votes are in! 🎄"
   - Re-vote: "Your votes have been updated!"
6. Year locked: "Voting is closed."

---

### 5.4 Public: History View — `/history`

Read-only. No auth.

- Year selector (all non-test locked years)
- Final leaderboard for selected year
- Per-game breakdown: game name, all team raw scores, placement points
- Costume Contest: vote-point totals per team
- Party foul log per team (count + descriptions)
- No edit controls — `is_locked = true` enforced

---

### 5.5 Admin: Setup Mode — `/admin/setup`

Password-protected. Pre-event configuration.

**Auth:** Single password against `ADMIN_PASSWORD` env var. Session cookie valid 24 hours. Multiple concurrent sessions supported — no invalidation when a second admin logs in. Same session covers both admin views.

**Year selector** at top — all admin sections act on the selected year.

#### 5.5.1 Year Management
- List all years with status badges (Active / Locked / Test)
- Create new year:
  - Year number input
  - "This is a test run" checkbox → sets `is_test = true`
  - Optional: copy team list from a prior year
- Set a year as active
- Cannot delete real years

#### 5.5.2 Team Management
- Add: name + hex color picker
- Edit: name or color
- Remove: only if no scores exist yet for this year
- Hard cap: 16 teams per year (creation blocked beyond this)
- All registered teams expected to compete in every game — missing scores flagged at event close
- Read-only if year is locked

#### 5.5.3 Game Configuration
- **Add from Library:** Search/browse GameLibrary → pre-fills all fields → admin overrides before saving
- **Add from Scratch:** Blank form
- **Per-game fields:** Name, instructions, scoring description, supplies, score type (high/low), score source (manual/voting), score unit, number of rounds (1 or 2), combine method (sum/average) if 2 rounds
- **Ordering:** Drag-and-drop `sort_order`. Intended play sequence. Changes here do not affect TV display mid-event.
- Read-only if year is locked

#### 5.5.4 Game Library
- Full CRUD
- Searchable by name
- `years_played` shown as derived count
- Host notes field
- Pre-populated from seed data

#### 5.5.5 Test Year Controls
- **Delete Test Year** button — visible only on `is_test = true` years
- Confirmation: "This will permanently delete [Year XXXX] and all its teams, games, scores, votes, and fouls. This cannot be undone."
- On confirm: cascading delete of all records with this `year_id`
- Real years have no delete option

---

### 5.6 Admin: Live Event Mode — `/admin/live`

Password-protected (same session). For use during the party. Always shows the active year.

#### 5.6.1 Game Control Panel

All games in `sort_order` order. Each row:

| Element | Behavior |
|---|---|
| Game name, score type, rounds | Display only |
| Status badge | Pending / Active / Complete |
| **Set Active** button | Sets `Year.active_game_id`. Atomic. Disabled if already active or complete. TV right panel updates on next poll. |
| **Mark Complete** button | Enabled only when game is active. Requires confirmation. Locks scores for this game. `completed_at` recorded. Triggers leaderboard update on TV. |
| Drag handle | Reorders `sort_order` in admin queue. TV is unaffected until "Set Active" is clicked. |

#### 5.6.2 Score Entry

Visible when any game is active or when admin selects a game to correct. Admin enters all scores — there is no public score entry.

- Team dropdown + score input(s) per round, with `score_unit` label
- Upsert logic: re-entering overwrites
- Admin can correct scores for complete games (bypasses `is_complete` lock — admin always has override)
- For `score_source = 'voting'` games (Costume Contest): score entry panel is replaced by the Costume Contest Monitor

#### 5.6.3 Party Foul Tracker

Always visible. Per team:
- Current foul count
- **"+ Add Foul"** → optional description field → saves `PartyFoul` record
- Foul history list with description, timestamp, and delete button (for mistakes)

#### 5.6.4 Costume Contest Monitor

Visible when a Costume Contest game is active or selected.
- Vote count: "X of Y teams have voted"
- Per-team vote-point totals, live (polls every 10s)
- **"Close Voting"** — marks Costume Contest complete, finalizes scores from current vote state

#### 5.6.5 Live Leaderboard Preview

Compact leaderboard in admin view, refreshing every 15 seconds. Host tracks standings without switching to the TV.

#### 5.6.6 End of Event Flow

**Step 1 — "Finish Games" button**

Appears when all games are marked complete. On click, validates:
- Every registered team has a score in every game

If missing scores found: lists each team/game combination. Admin must either:
- Enter missing scores inline, then re-click "Finish Games", OR
- Confirm an override to proceed (missing teams get 0 points for that game)

On confirmation:
- `Year.is_locked = true`
- `display_mode` remains `scoreboard` (TV unchanged)
- Final leaderboard shown in admin, with tie-break resolution applied
- If any ties reach Step 5 (unresolvable by algorithm): admin is shown a warning listing the tied teams and positions before proceeding
- Podium controls appear

**Step 2 — Podium Reveal Controls**

```
[🥉 Reveal 3rd]  [🥈 Reveal 2nd]  [🥇 Reveal 1st]  [🎉 Show All]
                                                      [↺ Reset Podium]
```

- Each button sets `podium_state` and ensures `display_mode = 'podium'`
- Sequential — each disabled until prior step complete
- If a Step 5 tie is present at a podium position, that button triggers the "Tie — Stand by..." hold state on TV. Admin resolves verbally, then clicks **"Advance Past Tie"** to continue.
- **Reset Podium** — sets `podium_state = 'hidden'` and `display_mode = 'scoreboard'` for rehearsal or redo. Always available.
- Admin sees final standings (who is 1st/2nd/3rd) before clicking the first reveal button

**Step 3 — Show Final Results**

Appears after `podium_state = 'show_all'` is reached. Cannot be skipped — podium must complete first.

- **"Show Final Results"** button → sets `display_mode = 'final_results'`
- TV transitions to Final Results layout on next poll (≤8s)
- `/final-results` public URL becomes active (year is already locked)
- Admin can return to podium via "Back to Podium" if needed

---

## 6. API Routes

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/scoreboard` | None | Full scoreboard payload: leaderboard (completed games only), active game scores, `display_mode`, `podium_state`. Edge-cached 5s. |
| GET | `/api/votes` | None | Live vote tallies for active year's Costume Contest |
| POST | `/api/votes` | None | Submit/update a vote (upsert by year+voting_team) |
| GET | `/api/final-results` | None | Final results data for active (or specified) year. Returns 403 if year not locked. |
| GET | `/api/history/:year` | None | Read-only full data for a past year |
| POST | `/api/admin/years` | Admin | Create a new year |
| PATCH | `/api/admin/years/:id` | Admin | Update year (`active_game_id`, `display_mode`, `podium_state`, `is_locked`, `is_active`) |
| DELETE | `/api/admin/years/:id` | Admin | Delete test year only (`is_test = true` required) — cascading |
| POST | `/api/admin/teams` | Admin | Add team (blocked if 16 already exist for year) |
| PATCH | `/api/admin/teams/:id` | Admin | Edit name, color |
| DELETE | `/api/admin/teams/:id` | Admin | Remove team (if no scores exist) |
| POST | `/api/admin/games` | Admin | Add game to year |
| PATCH | `/api/admin/games/:id` | Admin | Edit config, `sort_order`, `is_complete` |
| DELETE | `/api/admin/games/:id` | Admin | Remove game (if no scores exist) |
| POST | `/api/admin/scores` | Admin | Enter/update a score (upsert by game+team+round) |
| POST | `/api/admin/fouls` | Admin | Add party foul record |
| DELETE | `/api/admin/fouls/:id` | Admin | Delete a foul record |
| POST | `/api/admin/library` | Admin | Add library entry |
| PATCH | `/api/admin/library/:id` | Admin | Edit library entry |
| DELETE | `/api/admin/library/:id` | Admin | Delete library entry |
| POST | `/api/admin/test/reset-scores` | Admin | Clear all scores for a game (test years only) |
| POST | `/api/admin/test/reset-votes` | Admin | Clear all votes for a year (test years only) |
| POST | `/api/admin/test/unlock-year` | Admin | Reset `is_locked`, `display_mode`, `podium_state` (test years only) |

---

## 7. Real-Time Architecture

**HTTP Polling — MVP approach**

| Endpoint | Poll Interval | Consumer |
|---|---|---|
| `/api/scoreboard` | 8 seconds | `/scoreboard` TV page |
| `/api/votes` | 10 seconds | `/vote` page + admin Costume Contest monitor |

- `/api/scoreboard` edge-cached for 5s to handle 20–30 simultaneous connections (TV + all phones) without DB saturation
- Cache invalidated by admin mutations via `revalidateTag` or by 5s TTL
- All display mode transitions (`display_mode`, `podium_state`) are included in the scoreboard payload — the TV reacts on the next poll cycle (max ~8s lag)
- **Future upgrade path:** Replace polling with Supabase Realtime. The scoring engine and component structure are data-fetching agnostic — this is a drop-in swap.

---

## 8. Test Mode

Full end-to-end rehearsal capability with isolated, deletable data.

### 8.1 Test Year Flag

`Year.is_test = true` marks a year as a test run. All data associated with that year is scoped and deletable. The game library is unaffected — it is a shared global.

**Visual treatment:** Persistent amber "⚠️ TEST" badge on year label everywhere in admin. Amber border on all admin panels when a test year is selected. Banner: "Test Mode — this data will not appear in history."

**Recommended test year number:** Use a fake year (e.g., 9999) to avoid colliding with the real event year when created later.

### 8.2 What Works Identically in Test Mode

The full feature surface is exercisable:
- Team/game setup
- Score entry in Live Mode (all games, all rounds)
- Costume Contest voting via `/vote`
- Scoreboard TV display (all three modes)
- Podium reveal sequence including tie states
- Final Results display
- Party foul recording

### 8.3 Test-Only Reset Controls

Available only when `is_test = true`:

| Control | Location | Action |
|---|---|---|
| **Clear Scores** (per game) | Live Mode, per game row | Deletes all Score records for that game |
| **Clear All Votes** | Live Mode, Costume Contest monitor | Deletes all CostumeVote records for the year |
| **Unlock Year** | Live Mode, end-of-event section | Resets `is_locked = false`, `display_mode = 'scoreboard'`, `podium_state = 'hidden'` |
| **Delete Test Year** | Setup Mode, year management | Cascading delete of year + all associated data |

### 8.4 What Is Not Isolated

Game library changes during a test run are real and permanent. Admin should avoid editing library entries during testing unless intentional.

---

## 9. Design & Theme

### 9.1 Aesthetic Direction

**"Vintage Christmas Carnival"** — rich, warm, festive, bold. Deep Christmas reds and forest greens, warm gold accents, playful but not childish. The scoreboard should feel like a decorated Christmas party, not a corporate dashboard.

### 9.2 Color Palette

| Role | Hex |
|---|---|
| Background dark | `#0D1F0F` |
| Background panel | `#1A3A1C` |
| Primary red | `#C41E3A` |
| Gold / 1st place | `#D4AF37` |
| Text primary | `#F5EDD6` |
| Text secondary | `#A8C5A0` |
| Silver / 2nd place | `#C0C0C0` |
| Bronze / 3rd place | `#CD7F32` |
| Test mode amber | `#F59E0B` |

### 9.3 Typography

| Role | Font |
|---|---|
| Display / headings | "Mountains of Christmas" (Google Fonts) |
| Body / UI | "Lora" (Google Fonts) |
| Scores / numbers | "DM Mono" (monospace for tabular data) |

Minimum font sizes for TV scoreboard (10–15 ft viewing distance): rank and total points ≥ 48px, team names ≥ 36px, secondary info ≥ 24px.

### 9.4 Motion & Decoration

- **Snowfall:** CSS `@keyframes` particle animation on scoreboard background — subtle, non-distracting
- **Rank changes:** Smooth CSS vertical slide + count-up number animation on each poll
- **Podium reveal:** Each step uses a dramatic CSS reveal — slide up from below, scale in, glow. 1st place: confetti burst + sparkle on name.
- **Tie hold state:** Pulsing amber glow on the held podium position
- **LED lights:** SVG light string along scoreboard header, twinkle CSS animation
- **Medals:** 🥇🥈🥉 on leaderboard and podium positions

### 9.5 Responsive Targets

| View | Primary | Notes |
|---|---|---|
| `/scoreboard` | 1920×1080 landscape | Minimum 1280×720. No mobile layout. |
| `/vote` | 375px mobile portrait | Primary mobile touchpoint |
| `/final-results` | 375px mobile + 1024px desktop | Accessible on phones after event |
| `/history` | 1024px desktop | Tablet minimum |
| `/admin/setup` | 1280px desktop | Tablet minimum |
| `/admin/live` | 1280px desktop | Tablet minimum |

---

## 10. Seed Data

Run once: `npx tsx scripts/seed.ts`

Seed data stored as version-controlled JSON in `/seed-data/`. Developer parses these files in the seed script — do not hardcode values in TypeScript.

### 10.1 Fixture Format (per year)

```json
{
  "year": 2023,
  "is_locked": true,
  "is_test": false,
  "teams": [
    { "name": "Delaney", "display_color": "#..." }
  ],
  "games": [
    {
      "name": "Wreath Toss",
      "score_type": "high_wins",
      "score_source": "manual",
      "score_unit": "points",
      "num_rounds": 1,
      "sort_order": 1,
      "is_complete": true
    }
  ],
  "scores": [
    { "team": "Delaney", "game": "Wreath Toss", "round": 1, "raw_score": 30 }
  ],
  "party_fouls": [
    { "team": "Buric", "description": null }
  ]
}
```

### 10.2 Historical Year Totals

**2023 — 10 teams, 6 games + Costume Contest**

| Team | Wreath | Rings | Rolo | Shovel | Swing | Costume Pts | Fouls | Final |
|---|---|---|---|---|---|---|---|---|
| Delaney | 30 | 24 | 22 | 26 | 30 | 26 | 0 | 158 (1st) |
| Buric | 26 | 24 | 30 | 30 | 18 | 30 | −4 | 154 (2nd) |
| Wahlert | 26 | 16 | 20 | 26 | 28 | 28 | −1 | 143 (3rd) |
| Jones | 14 | 24 | 28 | 26 | 26 | 22 | 0 | 140 (4th) |
| Murphy | 28 | 16 | 24 | 28 | 26 | 14 | 0 | 136 (5th) |
| Hartberg | 26 | 30 | 16 | 26 | 20 | 16 | −1 | 133 (6th) |
| Huggins | 12 | 28 | 26 | 26 | 22 | 14 | −1 | 127 (7th) |
| Hemphill | 26 | 28 | 18 | 12 | 12 | 18 | −3 | 111 (8th) |
| Lyons | 16 | 16 | 12 | 16 | 16 | 26 | −2 | 100 (9th) |
| Mears | 18 | 18 | 14 | 14 | 14 | 20 | −2 | 96 (10th) |

*Note: 2023 values above are final placement points, not raw game scores. Store as `raw_score` in Score table; scoring engine will reproduce matching totals.*

**2024 — 14 teams | Final totals:** Delaneys 168, Wahlerts 146, Burics 138, Huggins 134, Hemphills 130, Newmans 126, Jones 114, Hagens 112, Hartbergs 108, Reiss 108, Carvers 104, Murphys 100, Lyons 92, Mears 86

**2025 — 8 teams | Final totals:** Newmans 138, Burics 136, Murphys 132, Hemphills 126, Huggins 122, Jones 120, Carvers 116, Lyons 90

> Full round-level scores for 2024 and 2025 are in the provided `RV-Reindeer-Games.xlsx`. Developer should parse the source Excel directly when building the JSON fixtures — do not transcribe manually.

### 10.3 Game Library (pre-populated)

| Game | Score Type | Source | Years Played |
|---|---|---|---|
| Wreath Toss | high_wins | manual | 2023 |
| Rolo Stack | high_wins | manual | 2023 |
| Shovel (spoon/cotton ball) | high_wins | manual | 2023 |
| Ornament Swing | high_wins | manual | 2023 |
| Ring Toss (antler headband) | high_wins | manual | 2023, 2025 |
| Costume Contest | high_wins | voting | 2023, 2024, 2025 |
| Cup-Ornament Flip | low_wins | manual | 2024 |
| Candy Cane Fishing | high_wins | manual | 2024, 2025 |
| Snow Shoveling | high_wins | manual | 2024 |
| Marshmallow Straw | high_wins | manual | 2024 |
| Ping Pong Kleenex Box | high_wins | manual | 2024 |
| Cup Pyramid (balance ball) | low_wins | manual | 2025 |
| Blowing Snowballs | low_wins | manual | 2025 |
| Stack the Sack (balloon) | low_wins | manual | 2025 |
| Candy Cane Zipline | low_wins | manual | 2025 |
| Ping Pong Hole in Lid | high_wins | manual | — |
| Hungry Hippos Reindeer Prance | high_wins | manual | — |
| Santa's Scooper | high_wins | manual | — |
| Candy Cane Scooping | high_wins | manual | — |
| Cup Stacking Contest | low_wins | manual | — |
| Chimney Drop | low_wins | manual | — |

Full 2025 game instructions seeded from `RV-Reindeer-Games-2025.docx`.

---

## 11. Environment Variables

```env
# Required
ADMIN_PASSWORD=your_secret_here
DATABASE_URL=your_vercel_postgres_connection_string
NEXTAUTH_SECRET=random_32_char_string

# Optional / defaults shown
NEXT_PUBLIC_APP_NAME="RV Reindeer Games"
NEXT_PUBLIC_POLL_INTERVAL_MS=8000
NEXT_PUBLIC_SCOREBOARD_CACHE_SECONDS=5
```

> **Sharing admin access:** Share the `ADMIN_PASSWORD` value with any co-host. To rotate, update in Vercel Dashboard → Settings → Environment Variables and redeploy. Existing 24-hour sessions remain valid until natural expiry.

---

## 12. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Scoreboard display mode transition | ≤ 10s from admin action to TV update |
| Podium step lag | ≤ 10s from admin button click to TV reveal |
| Concurrent connections | 30 simultaneous (phones + TV) without degradation |
| Data persistence | Postgres — survives restarts and Vercel cold starts |
| Admin session | 24-hour cookie; multiple concurrent sessions |
| DB write safety | Upserts for scores and votes — no duplicate rows |
| TV font sizing | Rank/points ≥ 48px for 10–15 ft readability |

---

## 13. Out of Scope (v1.0)

- Public score entry by participants (admin-only in v1)
- Individual participant user accounts
- Push notifications / SMS
- Native mobile app
- WebSocket / Supabase Realtime (polling sufficient for v1)
- Custom domain (configurable post-deploy in Vercel)
- Costume photo uploads
- Email recap after event

---

## 14. Suggested Build Order

1. **DB schema** — Drizzle schema + initial migration. All tables, constraints, enums.
2. **Seed fixtures** — Build `/seed-data/*.json` from source Excel + Word docs. Run seed script and verify row counts.
3. **Scoring engine** (`/lib/scoring.ts`) — Pure functions. Unit-test against 2023/2024/2025 fixtures until all three years reproduce correct final standings. Do not proceed until passing.
4. **Tie-breaker logic** — Implement `applyTieBreakers()`. Unit-test with synthetic tied scenarios.
5. **Admin Setup Mode** — Year, team (with 16-cap), game, library management. Test year creation and deletion.
6. **Admin Live Mode** — Game controls, score entry, party foul tracker, Costume Contest monitor.
7. **End of Event flow** — Finish Games validation, podium controls, Final Results activation. Tie Step 5 hold state.
8. **Costume Voting page** (`/vote`) — Voting form, upsert, live tally.
9. **Scoreboard TV view** (`/scoreboard`) — All three modes: split view, podium, final results. Polling. Animations.
10. **Final Results page** (`/final-results`) — Public, mobile-friendly standalone view.
11. **History View** (`/history`) — Read-only, test years excluded.
12. **Test Mode reset controls** — Clear scores, clear votes, unlock year (test years only).
13. **Polish** — Christmas theming, snowfall, LED lights, font sizing, responsive tweaks.
14. **Deploy** — Vercel project, env vars, Postgres provisioning, run seed script, smoke test all routes.

---

## 15. Acceptance Criteria

### Setup
- [ ] Admin can create a year (real or test) and set it as active
- [ ] Admin can add/edit/remove teams; hard cap of 16 enforced at creation
- [ ] Admin can add games from library or scratch with all config options
- [ ] Admin can set game play order via drag-and-drop
- [ ] Admin can browse, search, and edit the game library
- [ ] Test years show amber badge and banner in all admin views
- [ ] "Delete Test Year" appears only on test years; cascading delete with confirmation

### Live Event — Score Entry
- [ ] Admin can enter and update scores for any team/game/round from Live Mode
- [ ] Score entry uses upsert — re-entry overwrites without stacking
- [ ] Admin can correct scores for complete games (admin override bypasses lock)
- [ ] No public score entry interface exists

### Live Event — Game Control
- [ ] Admin sets one game active (atomic — previous active auto-cleared)
- [ ] Reordering games in admin queue does not affect TV display
- [ ] TV right panel only changes when "Set Active" is clicked
- [ ] Admin marks game complete — scores lock, leaderboard updates on TV
- [ ] `completed_at` timestamp recorded

### Live Event — Party Fouls
- [ ] Admin adds fouls with optional description
- [ ] Individual fouls visible in history list with delete option
- [ ] Foul count reflected in leaderboard on next TV poll

### Costume Contest
- [ ] `/vote` accessible only when Costume Contest game exists and year is not locked
- [ ] Only registered teams in dropdown
- [ ] Teams may vote for themselves
- [ ] 1st/2nd/3rd must be distinct (client + server enforced)
- [ ] Re-voting upserts (overwrites prior vote)
- [ ] Vote-to-score: 1st=10, 2nd=7, 3rd=5; summed per receiving team
- [ ] Admin can close voting → game marked complete
- [ ] Costume Contest raw score in Final Results = vote-point total per team

### Scoring Engine
- [ ] Reproduces correct 2023, 2024, 2025 final standings (test fixtures)
- [ ] Only completed games contribute to overall leaderboard
- [ ] Active game scores appear only in the right panel, not left panel totals
- [ ] Ties: both teams share the higher place and both get higher-place points
- [ ] `high_wins` and `low_wins` rank correctly
- [ ] Multi-round games combine by sum or average correctly
- [ ] Provisional ranking shown after round 1 of 2-round game, labeled "Provisional"
- [ ] Party fouls deduct correctly from totals
- [ ] Tie-breakers applied in correct sequence (steps 1–5)
- [ ] Costume Contest excluded from "game wins" tie-breaker (step 1)
- [ ] Costume Contest included in "top-3 finishes" tie-breaker (step 2)
- [ ] Step 5 tie surfaces as unresolved flag — podium holds, admin resolves verbally

### Scoreboard — Split View
- [ ] Left panel: Rank, Team, Total Points, Party Fouls, Games Completed X/Y
- [ ] Only completed games in left panel totals
- [ ] Right panel: active game scores, raw scores, provisional label if applicable
- [ ] Rank change animations on each poll
- [ ] "No active game" idle state
- [ ] Auto-refreshes every 8 seconds
- [ ] Landscape only; minimum 1280×720; font sizes meet 10–15 ft readability

### Scoreboard — Podium Mode
- [ ] Split view replaced when `display_mode = 'podium'`
- [ ] Sequential reveal: 3rd → 2nd → 1st → All
- [ ] Each step has distinct animation; 1st place most elaborate
- [ ] Tied positions reveal both teams simultaneously
- [ ] Step 5 tie: pulsing amber hold state on TV; "Advance Past Tie" in admin
- [ ] Admin sees final standings before first reveal
- [ ] Reset Podium returns to scoreboard mode

### Scoreboard — Final Results Mode
- [ ] Triggered only after `show_all` podium state; cannot skip podium
- [ ] TV renders Final Results layout at `/scoreboard` (no URL change)
- [ ] Podium summary (top) + detailed results table (below)
- [ ] All teams, all games as columns, party fouls, final totals shown
- [ ] `/final-results` public URL active once year is locked
- [ ] `/final-results` is mobile-friendly

### End of Event
- [ ] "Finish Games" validates all team/game scores before locking
- [ ] Lists missing combinations; admin enters inline or overrides
- [ ] Year locks — all public votes and score writes rejected
- [ ] Podium controls appear after lock
- [ ] "Show Final Results" only appears after `podium_state = 'show_all'`

### History
- [ ] 2023, 2024, 2025 data correct and viewable
- [ ] Party foul descriptions visible
- [ ] No edit controls on locked years
- [ ] Test years excluded by default

### Test Mode
- [ ] Full feature surface works identically in test years
- [ ] "Clear Scores", "Clear All Votes", "Unlock Year" available on test years only
- [ ] Game library unaffected by test year deletion
- [ ] `/final-results` and podium fully testable in test years

### General
- [ ] Christmas theme consistent across all views
- [ ] Deployed and accessible via public Vercel URL
- [ ] All environment variables documented and functional
- [ ] Seed script reproducibly generates correct historical data

---

*End of PRD — RV Reindeer Games v3.0*
