# Product Requirements Document

## RV Reindeer Games — Live Scoreboard Web App

**Version:** 1.0  
**Date:** May 2026  
**Prepared for:** Developer handoff / Vercel deployment

-----

## 1. Overview

### 1.1 Product Summary

The RV Reindeer Games app is a Christmas-themed, real-time scoring and scoreboard web application for an annual holiday party competition. Couples compete in a series of Christmas-themed games each year. The app replaces a manual Excel spreadsheet with a live, TV-displayable scoreboard, a public score-entry interface, and a password-protected admin panel for managing events, games, and participants.

### 1.2 Core Goals

- **Live scoreboard** displayed on a TV/projector during the event, with a split view showing the overall leaderboard and current game standings side-by-side
- **Open score entry** — any participant can enter scores from their phone for the current game
- **Admin panel** — host manages years, teams, games, and game configuration
- **Historical records** — read-only view of past years (2023, 2024, 2025 pre-loaded)
- **Game library** — store game names, instructions, and scoring rules year over year
- **Automatic ranking and points** — app computes placements and point totals from raw scores in real time

### 1.3 Audience

- **Host (Admin):** Sets up the event, configures games and teams, manages the session
- **Participants:** Enter scores from their phones; view the live scoreboard
- **Room display:** A browser tab open on a TV or projector showing the live split-view scoreboard

-----

## 2. Tech Stack & Deployment

|Layer     |Choice                                                    |Notes                                         |
|----------|----------------------------------------------------------|----------------------------------------------|
|Frontend  |Next.js (App Router)                                      |Handles both UI and API routes                |
|Styling   |Tailwind CSS                                              |Rapid, consistent Christmas theming           |
|Database  |Vercel Postgres (or Supabase)                             |Persistent storage for all years/games/scores |
|Real-time |Vercel KV + polling or Supabase Realtime                  |Live score updates without page refresh       |
|Auth      |Simple password-based admin auth (next-auth or custom JWT)|No user accounts needed; single admin password|
|Deployment|Vercel                                                    |Auto-deploy from GitHub                       |
|Fonts     |Google Fonts (see Design section)                         |Load via Next.js font optimization            |

### 2.1 Repository Structure (suggested)

```
/app
  /admin         → Admin panel pages (password protected)
  /scoreboard    → TV display view (public, auto-refreshing)
  /score-entry   → Score entry for participants (public)
  /history       → Read-only past years view
  /api           → API routes for all data operations
/components
/lib             → DB client, scoring logic, auth helpers
/public          → Static assets (Christmas decorations, snowflake SVGs, etc.)
```

-----

## 3. Data Model

### 3.1 `Year`

|Field     |Type     |Notes                         |
|----------|---------|------------------------------|
|id        |UUID     |Primary key                   |
|year      |Integer  |e.g. 2026                     |
|is_active |Boolean  |Only one year active at a time|
|created_at|Timestamp|                              |

### 3.2 `Team`

|Field        |Type   |Notes                                   |
|-------------|-------|----------------------------------------|
|id           |UUID   |Primary key                             |
|year_id      |UUID   |FK → Year                               |
|name         |String |e.g. “Murphys”, “Burics”                |
|display_color|String |Hex color for scoreboard differentiation|
|party_fouls  |Integer|Default 0; incremented by admin only    |

### 3.3 `Game`

|Field               |Type   |Notes                                              |
|--------------------|-------|---------------------------------------------------|
|id                  |UUID   |Primary key                                        |
|year_id             |UUID   |FK → Year                                          |
|name                |String |e.g. “Candy Cane Zipline”                          |
|instructions        |Text   |Full instructions for display                      |
|scoring_description |String |Short summary of how score is measured             |
|score_type          |Enum   |`high_wins` or `low_wins`                          |
|score_unit          |String |e.g. “rings”, “seconds” — shown in UI              |
|num_rounds          |Integer|1 = single score; 2+ = multi-round                 |
|round_combine_method|Enum   |`sum` or `average` (only applies if num_rounds > 1)|
|sort_order          |Integer|Display/play order                                 |
|is_active           |Boolean|Currently being played (only one at a time)        |
|is_complete         |Boolean|All scores locked in                               |
|library_game_id     |UUID   |Optional FK → GameLibrary (if sourced from library)|

### 3.4 `Score`

|Field     |Type     |Notes                                                         |
|----------|---------|--------------------------------------------------------------|
|id        |UUID     |Primary key                                                   |
|game_id   |UUID     |FK → Game                                                     |
|team_id   |UUID     |FK → Team                                                     |
|round     |Integer  |1, 2, etc. Default 1                                          |
|raw_score |Decimal  |The actual score entered (rings caught, seconds elapsed, etc.)|
|entered_by|String   |Optional: participant name who entered it                     |
|created_at|Timestamp|                                                              |

### 3.5 `GameLibrary`

|Field              |Type     |Notes                     |
|-------------------|---------|--------------------------|
|id                 |UUID     |Primary key               |
|name               |String   |Game name                 |
|instructions       |Text     |Full instructions         |
|scoring_description|String   |                          |
|score_type         |Enum     |`high_wins` or `low_wins` |
|score_unit         |String   |                          |
|supplies           |Text     |Bulleted supply list      |
|years_played       |Integer[]|Array of years used       |
|notes              |Text     |Host notes from past years|

### 3.6 `HistoricalYear` (pre-seeded, read-only)

Pre-populate 2023, 2024, and 2025 data from the provided Excel file as seed data. Mark these years with a `is_historical = true` flag. The app will prevent writes to any year with this flag set.

-----

## 4. Scoring Engine

All ranking and point assignment logic lives in a shared server-side utility (`/lib/scoring.ts`) so it is consistent across all views.

### 4.1 Per-Game Ranking

1. For each game, collect the **combined score** per team:
- If `num_rounds = 1`: combined score = raw score
- If `num_rounds > 1`: combined score = sum or average of all round scores (per `round_combine_method`)
1. Sort teams by combined score:
- `high_wins`: descending (highest score = 1st place)
- `low_wins`: ascending (lowest score = 1st place)
1. **Ties:** Tied teams share the same place (e.g., two teams tied for 2nd both get 2nd place). The next team after them gets 4th place (no 3rd), etc.
1. Assign points per place per the table below.

### 4.2 Points Table

|Place|Points|
|-----|------|
|1st  |30    |
|2nd  |28    |
|3rd  |26    |
|4th  |24    |
|5th  |22    |
|6th  |20    |
|7th  |18    |
|8th  |16    |
|9th  |14    |
|10th |12    |
|11th |10    |
|12th |8     |
|13th |6     |
|14th |4     |
|15th |2     |
|16th+|1     |

### 4.3 Party Fouls

- Party fouls are tracked per team, per year
- Each party foul deducts **1 point** from the team’s total (same behavior as the existing spreadsheet)
- Only admins can record/modify party fouls

### 4.4 Overall Leaderboard

Total points = sum of all per-game points earned + (party_fouls × −1)

Teams that did not compete in a game receive 0 points for that game (not ranked).

-----

## 5. Features & Pages

### 5.1 Public: Live Scoreboard (`/scoreboard`)

This is the TV/projector view. It should be visually dramatic and Christmas-themed.

**Layout:** Full-screen split view

- **Left panel (~55% width):** Overall leaderboard — ranked list of all teams with total points, medal icons for top 3, animated rank changes when scores update
- **Right panel (~45% width):** Current game — game name, instructions summary, live score entry results as they come in (team name + score entered + their current rank in this game)

**Behavior:**

- Auto-refreshes every 5–10 seconds (polling or Supabase Realtime)
- When no game is active, right panel shows a “Waiting for next game…” Christmas animation
- Rank changes animate (smooth transitions, not jarring jumps)
- Display the current year and event name at the top
- A subtle snowfall CSS animation in the background

**No user interaction** on this view — display only.

-----

### 5.2 Public: Score Entry (`/score-entry` or `/enter`)

Mobile-optimized. Anyone at the party can use this.

**Flow:**

1. Select the active year (auto-selected to current active year)
1. Select your team from a dropdown
1. View the currently active game name + instructions (collapsible)
1. Enter score(s):
- If `num_rounds = 1`: single score input field with unit label
- If `num_rounds > 1`: one input per round, labeled “Round 1”, “Round 2”, etc.
1. Optional: enter your name (who entered this)
1. Submit — show a fun Christmas confirmation animation
1. Can re-enter/correct a score before the game is marked complete by admin

**Validation:**

- Must select a team
- Score must be a positive number
- If game is marked complete, score entry is locked with a friendly message

-----

### 5.3 Admin Panel (`/admin`)

Password-protected. Single shared admin password set via environment variable.

#### 5.3.1 Dashboard

- Overview of current active year
- Quick stats: teams registered, games configured, games completed
- Shortcut buttons to common actions

#### 5.3.2 Year Management

- List all years
- Create a new year (sets it as active, deactivates previous)
- View any year’s data
- Cannot delete a year

#### 5.3.3 Team Management (per year)

- Add/edit/remove teams for the active year
- Assign display color per team
- Record party fouls (increment/decrement per team)
- Cannot edit teams for historical (read-only) years

#### 5.3.4 Game Management (per year)

- Add games to the active year from:
  - **The Game Library** (pre-populated with all past games, searchable)
  - **Scratch** (fill in all fields manually)
- Configure per game:
  - Name, instructions, scoring description, supplies
  - Score type: `High score wins` or `Low score (time) wins`
  - Score unit (e.g., “rings”, “seconds”, “marshmallows”)
  - Number of rounds (1 or 2)
  - If 2 rounds: combine method (Sum or Average)
  - Sort order (drag to reorder)
- **Set Active Game:** Mark one game as currently active (what participants see on score entry and right panel of scoreboard)
- **Mark Game Complete:** Locks scores, finalizes rankings for that game
- Cannot edit games for historical years

#### 5.3.5 Score Management (per game)

- View all scores entered for any game
- Edit or delete any individual score entry
- Manually enter a score on behalf of a team
- See calculated combined scores and current rankings

#### 5.3.6 Game Library

- Full library of all games ever played or considered
- Add/edit games in the library
- See which years each game was played
- Host notes field per game
- Pre-populated from the Ideas sheet in the Excel file (all 2023/2024/2025 games + future ideas)

-----

### 5.4 History View (`/history`)

Public, read-only.

- Year selector (2023, 2024, 2025, and any future completed years)
- Final leaderboard for selected year (total points, final rankings)
- Per-game results: game name, team scores, rankings
- Game instructions for each game played that year
- Party fouls per team
- **Cannot edit anything** — purely for browsing past events

-----

## 6. Design & Theme

### 6.1 Aesthetic Direction

**“Vintage Christmas Carnival”** — rich, warm, festive, and bold. This should feel like a hand-decorated Christmas party, not a sterile app. Think: deep Christmas reds and forest greens, warm gold accents, illustrated snowflake details, and a slightly playful but not childish feel.

### 6.2 Color Palette

|Role                     |Value                                      |
|-------------------------|-------------------------------------------|
|Background (dark)        |`#0D1F0F` (deep Christmas tree green-black)|
|Background (light panels)|`#1A3A1C`                                  |
|Primary accent           |`#C41E3A` (classic Christmas red)          |
|Gold accent              |`#D4AF37` (warm gold)                      |
|Text primary             |`#F5EDD6` (warm off-white/cream)           |
|Text secondary           |`#A8C5A0` (muted sage)                     |
|Success/highlight        |`#E8F5E9`                                  |

### 6.3 Typography

- **Display/Headings:** “Mountains of Christmas” (Google Fonts) — festive but legible
- **Body/UI:** “Lora” (Google Fonts) — warm serif, readable at small sizes
- **Scores/Numbers:** “DM Mono” — clean monospace for score tables

### 6.4 Motion & Decoration

- CSS snowfall animation on scoreboard background (subtle, not distracting)
- Rank changes on the leaderboard animate with a smooth slide + number count-up
- Score submission triggers a brief confetti or snowflake burst
- Top 3 positions on leaderboard display gold/silver/bronze medal icons (🥇🥈🥉)
- Subtle twinkling star or light effects along borders on the TV view
- Red and green LED light string SVG decorating the top of the scoreboard header

### 6.5 Responsive Design

|View          |Priority                               |
|--------------|---------------------------------------|
|`/scoreboard` |Desktop/TV landscape (1920×1080 target)|
|`/score-entry`|Mobile portrait (375px+)               |
|`/admin`      |Desktop (tablet minimum)               |
|`/history`    |Desktop + tablet                       |

-----

## 7. Real-Time Architecture

### Option A: Polling (simpler, recommended for MVP)

- `/scoreboard` page polls `/api/scoreboard` every 8 seconds
- `/score-entry` polls `/api/active-game` every 10 seconds to pick up game changes
- Simple, no WebSocket infra needed, works on Vercel serverless

### Option B: Supabase Realtime (if Supabase chosen as DB)

- Subscribe to score and game table changes
- Instant updates to scoreboard when scores are entered
- Recommended if the developer is comfortable with Supabase

**Recommendation:** Start with polling (Option A) for simplicity. Add realtime as an enhancement.

-----

## 8. Seed Data

The developer should create a seed script (`/lib/seed.ts`) that pre-populates:

### 8.1 Historical Years (read-only)

**2023 — 10 teams, 6 games + Costume**

Teams: Buric, Delaney, Hartberg, Hemphill, Huggins, Jones, Lyons, Mears, Murphy, Wahlert

Games & Scores:

|Team    |Wreath|Rings|Rolo|Shovel|Swing|Costume|Party Fouls|Total Points|
|--------|------|-----|----|------|-----|-------|-----------|------------|
|Delaney |30    |24   |22  |26    |30   |26     |0          |158 (1st)   |
|Buric   |26    |24   |30  |30    |18   |30     |-4         |154 (2nd)   |
|Wahlert |26    |16   |20  |26    |28   |28     |-1         |143 (3rd)   |
|Jones   |14    |24   |28  |26    |26   |22     |0          |140 (4th)   |
|Murphy  |28    |16   |24  |28    |26   |14     |0          |136 (5th)   |
|Hartberg|26    |30   |16  |26    |20   |16     |-1         |133 (6th)   |
|Huggins |12    |28   |26  |26    |22   |14     |-1         |127 (7th)   |
|Hemphill|26    |28   |18  |12    |12   |18     |-3         |111 (8th)   |
|Lyons   |16    |16   |12  |16    |16   |26     |-2         |100 (9th)   |
|Mears   |18    |18   |14  |14    |14   |20     |-2         |96 (10th)   |

**2024 — 14 active teams, 5 games + Costume**

Teams: Huggins, Delaneys, Jones, Wahlerts, Hemphills, Carvers, Newmans, Hagens, Burics, Reiss, Murphys, Mears, Hartbergs, Lyons

Final standings (points):

|Team     |Total|
|---------|-----|
|Delaneys |168  |
|Wahlerts |146  |
|Burics   |138  |
|Huggins  |134  |
|Hemphills|130  |
|Newmans  |126  |
|Jones    |114  |
|Hagens   |112  |
|Hartbergs|108  |
|Reiss    |108  |
|Carvers  |104  |
|Murphys  |100  |
|Lyons    |92   |
|Mears    |86   |

**2025 — 8 active teams, 6 games + Costume**

Teams: Huggins, Carvers, Murphys, Burics, Newmans, Hemphills, Jones, Lyons

Final standings (points):

|Team     |Total|
|---------|-----|
|Newmans  |138  |
|Burics   |136  |
|Murphys  |132  |
|Hemphills|126  |
|Huggins  |122  |
|Jones    |120  |
|Carvers  |116  |
|Lyons    |90   |

### 8.2 Game Library (pre-populated)

Seed all games from the Ideas sheet and the 2025 game instructions document, including:

|Game Name                    |Years Played    |Score Type|
|-----------------------------|----------------|----------|
|Wreath Toss                  |2023            |high_wins |
|Rolo Stack                   |2023            |high_wins |
|Shovel (spoon/cotton ball)   |2023            |high_wins |
|Ornament Swing               |2023            |high_wins |
|Ring Toss (antler headband)  |2023, 2025      |high_wins |
|Costume Contest              |2023, 2024, 2025|high_wins |
|Cup-Ornament Flip            |2024            |low_wins  |
|Candy Cane Fishing           |2024, 2025      |high_wins |
|Snow Shoveling               |2024            |high_wins |
|Marshmallow Straw            |2024            |high_wins |
|Ping Pong Kleenex Box        |2024            |high_wins |
|Cup Pyramid (balance ball)   |2025            |low_wins  |
|Blowing Snowballs            |2025            |low_wins  |
|Stack the Sack (balloon)     |2025            |low_wins  |
|Candy Cane Zipline           |2025            |low_wins  |
|Ping Pong Hole in Lid        |Future idea     |high_wins |
|Hungry Hippos Reindeer Prance|Future idea     |high_wins |
|Santa’s Scooper              |Future idea     |high_wins |
|Candy Cane Scooping          |Future idea     |high_wins |
|Cup Stacking Contest         |Future idea     |low_wins  |
|Chimney Drop                 |Future idea     |low_wins  |

Full instructions for all 2025 games should be seeded from the provided Word document.

-----

## 9. Environment Variables

```env
ADMIN_PASSWORD=your_secret_password_here
DATABASE_URL=your_postgres_connection_string
NEXTAUTH_SECRET=random_secret_string
NEXT_PUBLIC_APP_NAME=RV Reindeer Games
NEXT_PUBLIC_POLL_INTERVAL_MS=8000
```

-----

## 10. Non-Functional Requirements

|Requirement                 |Target                                                                    |
|----------------------------|--------------------------------------------------------------------------|
|Scoreboard refresh          |≤ 10 seconds for score changes to appear on TV                            |
|Mobile score entry load time|< 2s on 4G                                                                |
|Concurrent users            |Supports 20–30 simultaneous mobile users comfortably                      |
|Uptime                      |Vercel edge — effectively 99.9%+                                          |
|Data persistence            |Postgres — survives browser/server restarts                               |
|Admin auth                  |Single shared password via env variable; session cookie valid for 24 hours|

-----

## 11. Out of Scope (v1.0)

- Individual user accounts / login per participant
- Push notifications
- Native mobile app
- Real-time WebSocket (polling is sufficient for v1)
- Custom domain (can be set up separately via Vercel)
- Photo uploads or costume photo gallery
- Email/SMS recap after event

-----

## 12. Suggested Build Order

1. **Database schema + seed script** — get all data models and historical data in place first
1. **Scoring engine** — pure functions, fully unit-tested before any UI
1. **Admin panel** — year, team, game management
1. **Score entry page** — mobile-optimized, connects to active game
1. **Scoreboard TV view** — split layout, polling, animations
1. **History view** — read-only past years
1. **Polish** — Christmas theming, animations, snowfall, responsive tweaks
1. **Deploy to Vercel** — configure env vars, connect Postgres

-----

## 13. Acceptance Criteria Checklist

- [ ] Admin can create a new year and set it as active
- [ ] Admin can add teams to the active year
- [ ] Admin can add games from library or scratch, with all configuration options
- [ ] Admin can set one game as active at a time
- [ ] Admin can mark a game complete (locks scores)
- [ ] Admin can record party fouls per team
- [ ] Participant can open score entry on mobile and see the active game
- [ ] Participant can select their team and enter a score (single or multi-round)
- [ ] Score entry is locked once admin marks game complete
- [ ] TV scoreboard auto-refreshes and shows split view
- [ ] Left panel shows overall ranked leaderboard with live point totals
- [ ] Right panel shows current game scores as entered
- [ ] Tied teams correctly share the same place and both receive the higher points
- [ ] Party fouls correctly deduct from team totals
- [ ] Historical years (2023, 2024, 2025) are viewable but not editable
- [ ] Game library is searchable and reusable across years
- [ ] Full Christmas theme applied across all views
- [ ] Deployed and accessible via public Vercel URL

-----

*End of PRD — RV Reindeer Games v1.0*