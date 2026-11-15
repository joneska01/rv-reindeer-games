# RV Reindeer Games

Christmas-themed live scoring app for the annual holiday party — a TV scoreboard,
a phone costume ballot, and a host panel. Next.js 16 · Drizzle · Postgres · Vercel.

```bash
cp .env.local.example .env.local   # fill in DATABASE_URL, ADMIN_PASSWORD, SESSION_SECRET (32+ chars)
npm install
npm run dev                        # http://localhost:3000
npm test                           # scoring engine + museum fixtures
```

- **Start here:** [docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md)
- **Architecture decisions:** [CLAUDE.md](CLAUDE.md)
- **Deploying:** [DEPLOY.md](DEPLOY.md)
- **Older requirements docs:** [docs/archive/](docs/archive/) (current spec: `RV-Reindeer-Games-PRD-v3.md`)
