# Deploying RV Reindeer Games to Vercel

A start-to-finish checklist for shipping to production. You've done Vercel before
(boredom-buster), but this one has a database and secrets, so a few extra steps.

## What you're deploying

Next.js 16 app on Vercel, backed by your **Prisma Postgres** database (provisioned
through the Vercel Marketplace in an earlier session). Production and local dev
currently share that one Prisma Postgres database — that's fine for a party app, just know
that the `9999` test edition and any rehearsal data live there too.

---

## 1. Confirm the production build is clean (already done ✅)

```bash
npm run build
```

This was run and passed — all 23 routes compiled. Re-run it any time you've made
changes you want to sanity-check before pushing.

> Heads up: `npm run build` writes to `.next`, the same folder `npm run dev` uses.
> If your dev server is running, stop it first, then restart `npm run dev` after.

## 2. Get the code onto `main`

All the work so far is on the `feature/phase-1-foundation-scoring` branch. Vercel
deploys your **Production branch** (usually `main`) to the production URL. So:

```bash
git checkout main
git merge feature/phase-1-foundation-scoring
git push origin main
```

(Or open a PR from the feature branch into `main` on GitHub and merge it there —
same result, with a nice diff to review. Say the word and I'll do the merge/PR.)

## 3. Set the environment variables in Vercel

Vercel dashboard → your project → **Settings → Environment Variables**. Add these
to the **Production** environment (and Preview, if you want preview deploys to work):

| Variable | Value | Notes |
|---|---|---|
| `ADMIN_PASSWORD` | *(pick a strong one)* | The single password for `/admin/login`. Share with co-hosts only. |
| `SESSION_SECRET` | *(generate — see below)* | Encrypts the login cookie. 32+ chars. |
| `DATABASE_URL` | *(likely already there)* | The Prisma Postgres integration usually injects this automatically. If you don't see it, copy the connection string from **Storage → your Prisma Postgres DB → Connect**. |
| `NEXT_PUBLIC_APP_NAME` | `RV Reindeer Games` | Optional — display name. |
| `NEXT_PUBLIC_POLL_INTERVAL_MS` | `8000` | Optional — scoreboard refresh (ms). |
| `NEXT_PUBLIC_VOTES_POLL_INTERVAL_MS` | `10000` | Optional — vote-booth refresh (ms). |

**Generate a SESSION_SECRET** (run locally, paste the output into Vercel — don't
commit it):

```bash
openssl rand -base64 32
```

> The app is resilient about the DB URL: if Vercel injects a prefixed name like
> `rv_reindeer_games_DATABASE_URL` instead of `DATABASE_URL`, the app auto-detects
> it (`lib/db-url.ts`). So either works.

## 4. Deploy

Pushing to `main` (step 2) triggers a production deploy automatically once the repo
is linked. Watch it in the Vercel dashboard → **Deployments**. If the build fails,
the log tells you which env var or route is unhappy.

(If you prefer the CLI: `vercel --prod` from the project root also works.)

## 5. Smoke-test production

Once it's live, open the production URL and check:

- [ ] Landing page loads, snow falls, links work.
- [ ] `/admin/login` accepts your `ADMIN_PASSWORD`.
- [ ] In the admin panel, create the **real 2026 edition** and set it active.
- [ ] Add your real teams + games (or copy teams from the test year).
- [ ] `/scoreboard` shows the standings; flip display modes from **Closing**.
- [ ] `/vote` opens when you set the Costume Contest active.
- [ ] `/history` shows 2023–2025.

## 6. Before the actual party

- The `9999` test edition is just for rehearsal — it's hidden from `/history` and
  you can wipe it any time via **Setup → Edition 9999 → Rehearsal Reset**.
- Make sure the **real** edition (not the test one) is the **active** one, so
  `/scoreboard` and `/vote` point at the right event.
- Put the production URL on the TV/projector at `/scoreboard` and leave it — it
  polls every 8s and never needs navigating.

---

That's it. Holler if any build log or env step looks off and I'll dig in.
