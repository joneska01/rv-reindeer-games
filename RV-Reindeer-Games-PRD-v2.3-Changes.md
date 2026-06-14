# RV Reindeer Games PRD v2.3 — Change Consolidation

This document captures all approved changes from the v2.2 review cycle and is intended to be merged into the master PRD.

## Approved Changes

### Technical Stack
- Database: Vercel Postgres
- ORM: Drizzle ORM
- Database schema managed through Drizzle migrations
- Production logging via Vercel Logs
- No dedicated error monitoring service required for v1

### Team Capacity
- Maximum supported teams: 16

### Admin Authentication
- Single shared password
- Multiple concurrent admin sessions supported
- Multiple hosts may be logged in simultaneously
- Sessions are not invalidated when another host logs in

### Score Entry
- Removed public score entry workflow
- Scores are entered exclusively through Admin Live Mode
- Participants cannot submit or modify game scores
- Costume voting remains public

### Leaderboard Logic
- Only completed games contribute to overall standings
- Active game scores appear only in the Current Game panel
- Overall leaderboard updates when a game is marked complete

### Scoreboard Layout

#### Left Panel
- Rank
- Team Name
- Total Points
- Party Fouls
- Games Completed: X / Y

#### Right Panel
- Current Game
- Scoring Description
- Current Rankings
- Current Raw Scores
- Waiting For Scores

### Display Requirements
- Optimized for 10–15 foot viewing distance
- Landscape only
- Primary: 1920×1080
- Minimum: 1280×720
- No mobile scoreboard experience in v1

### Historical Seed Data
Use version-controlled JSON fixtures:

/seed-data
- 2023.json
- 2024.json
- 2025.json

### Overall Event Tie Breakers

Overall podium positions may not end in a tie.

Tie-break sequence:

1. Most game wins (1st place finishes)
2. Most top-3 finishes
3. Fewest party fouls
4. Higher placement in the final completed game
5. Manual admin resolution

Tie resolution is used consistently for:
- Final leaderboard
- Podium reveal
- Final results display
- History view

### Final Results Display

#### Route
`/final-results`

#### Activation
Available after year lock.

Admin button:
`Show Final Results`

#### Layout

##### Podium Summary
- Static podium display
- 1st, 2nd, 3rd
- Team names
- Final scores

##### Detailed Results Table
Columns:
- Rank
- Team
- Raw score per game
- Placement points per game
- Party fouls
- Final total

### Display Mode Model Update

Add:

```ts
display_mode:
  "scoreboard"
  "podium"
  "final_results"
```

### Developer Guidance

Recommended implementation:
- Next.js App Router
- Tailwind CSS
- Vercel Postgres
- Drizzle ORM
- HTTP polling
- Vercel deployment

This revision resolves all outstanding product decisions identified during the architecture, UI/UX, and engineering review process.
