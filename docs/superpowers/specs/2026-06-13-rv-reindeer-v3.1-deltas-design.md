# RV Reindeer Games — v3.1 Design Deltas

**Date:** 2026-06-13
**Status:** Approved — implementation in progress
**Supersedes:** specific points in `RV-Reindeer-Games-PRD-v3.md` (otherwise v3 still governs)

This document records decisions made after the v3 PRD, reconciling the plan with
current platform reality, the chosen aesthetic, and the actual state of the
historical data. Everything in PRD v3 not contradicted here still applies.

---

## 1. Stack & platform corrections

| PRD v3 said | Reality / decision |
|---|---|
| "Vercel Postgres (Neon-backed)" | **Vercel Postgres is discontinued.** Use **Neon via the Vercel Marketplace.** The code already uses the `postgres-js` driver + plain `DATABASE_URL`, so this is a provisioning change only — no code rearchitecting. |
| `NEXTAUTH_SECRET` in env list | Code uses **`iron-session` + `SESSION_SECRET`** (CLAUDE.md is correct; PRD §11 was stale). |
| `@vercel/postgres` dependency | **Dropped** — unused; `lib/db.ts` uses `postgres-js`. |
| Next.js 14+ | Pinned at **Next.js 16** (already installed). |

## 2. Conventions (mirrored from `boredom-buster`)

- **Tailwind v4 CSS-first** — design tokens in a `@theme` block in `globals.css`
  (pattern: `--color-rv-cranberry`, `--color-rv-gold`, …).
- **`@/` path alias**, **`import type`** for type-only imports, strict TS / no unused.
- **Colocated pure-function tests** (`scoring.ts` + `scoring.test.ts`), Vitest.
- Deliberate divergences (framework-required): `next/font` instead of `@fontsource`;
  Next API routes instead of React Router.

## 3. Theme: "Cheeky but classy"

Elegant holiday cocktail-party / awards-gala feel. The wink lives in **copy and
motifs**, never anything crude (it's on a TV that may face in-laws).

**Palette (tokens):**

| Role | Hex |
|---|---|
| Background (deep forest) | `#0B2818` |
| Panel | `#13351F` |
| Cranberry (primary) | `#B01E2E` |
| Champagne gold (1st) | `#D4AF37` |
| Cream (text) | `#F5EDD6` |
| Sage (secondary text) | `#A8C5A0` |
| Silver / Bronze | `#C0C0C0` / `#CD7F32` |
| Test amber | `#F59E0B` |

**Type:** Display = **Cinzel** (engraved, ceremonial — gala podium feel, replaces
PRD's "Mountains of Christmas"). Body = **Lora**. Scores = **DM Mono**.

**Cheek (tasteful):** Party Fouls framed as a "🔔 Naughty List"; witty idle/loading
microcopy ("Refill your eggnog — next game's loading…"); champagne-coupe / spiked-
cocoa accent motif; gala-style podium reveal (gold shimmer, confetti on 1st,
twinkling string lights).

## 4. Historical data: "Museum" fidelity (key decision)

Reverse-engineering `RV-Reindeer-Games.xlsx` revealed the source sheets scored each
year with **different, partly-inconsistent rules**:

| Year | Fouls applied to totals? | All games counted? | Costume scoring |
|---|---|---|---|
| 2023 | ✅ yes (−1 each) | ✅ yes (6) | ✅ standard (votes → placement pts) |
| 2024 | ❌ recorded but **never subtracted** | ✅ yes (6) | ✅ standard |
| 2025 | — none recorded | ❌ **Candy Cane Zipline dropped from totals** | ❌ **ad-hoc** hand-entered values |

A single canonical engine therefore **cannot** reproduce all three documented totals.

**Decision — Museum:** preserve documented past results exactly (quirks and all).
History is **display-only**, served from curated JSON fixtures; past years are **not**
recomputed by the live engine. Engine correctness is proven instead against:
1. **2023** (the one fully rule-consistent year) — engine reproduces documented standings.
2. A **comprehensive synthetic test suite** — low/high wins, 2-round sum/avg,
   provisional rounds, voting 10/7/5, ties sharing places, all 5 tie-breakers,
   party-foul deductions, costume excluded from step-1 / included in step-2.

**Fixture schema** (`seed-data/YYYY.json`) is unified for both uses — see file headers.
Each game carries `counted` (false = played-but-excluded, e.g. 2025 Zipline); each
foul carries `applied`. Museum-integrity test asserts, per team:
`Σ(counted placement_points) − Σ(applied fouls) === final_total`.

**Consequence:** the public **History view reads the JSON fixtures directly** (no DB,
no engine) — mirroring boredom-buster's bundled-`activities.json` pattern. The
production seed (`scripts/seed.ts`) therefore seeds **only the game library** into the
DB; historical years live as static museum exhibits. (This refines PRD §10, which
assumed historical years were seeded into the DB.)

**Known fidelity note:** museum per-game columns show **placement points**, not raw
units (rings/seconds), because the source raw data is incomplete/corrupt for 2024–25.
Clean raw round data exists for 2025 if richer history is ever wanted.

## 5. Phased build (checkpoint after each)

1. **Foundation & verified scoring** *(test gate)* — museum fixtures (2023/24/25),
   `scripts/seed.ts` (library), colocated `scoring.test.ts` (2023 + synthetic),
   fix broken `npm run seed`, drop `@vercel/postgres`. Provision Neon, run migration
   + seed. **Exit:** all tests green; 2023 reproduces documented standings.
2. **Theme system & shared UI** — `@theme` tokens, fonts, shared primitives
   (Button/Card/Badge/Panel), snowfall + string-lights, cheeky-copy constants.
3. **Admin** — login/auth, admin API routes, Setup Mode, Live Mode, end-of-event flow.
4. **Public views** — `/scoreboard` (3 modes + polling + animations), `/vote`,
   `/final-results`, `/history` (museum), public GET APIs.
5. **Test-mode controls, polish & deploy** — reset controls, responsive passes,
   theme polish, full smoke test, production deploy.

Out-of-scope list is unchanged from PRD v3 §13.
