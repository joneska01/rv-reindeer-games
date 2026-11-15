/**
 * Resolve the Postgres connection string.
 *
 * Normally this is `DATABASE_URL`. But `vercel env pull` in *repo-link* mode
 * prefixes variables with the project name (e.g. `rv_reindeer_games_DATABASE_URL`),
 * so we fall back to any `*_DATABASE_URL` / `*_POSTGRES_URL` key. In production
 * the unprefixed `DATABASE_URL` is set, so the fallback is a local-dev convenience.
 */
export function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const keys = Object.keys(process.env);
  const fallback =
    keys.find((k) => /_DATABASE_URL$/i.test(k) && !/PRISMA/i.test(k)) ??
    keys.find((k) => /_POSTGRES_URL$/i.test(k) && !/PRISMA/i.test(k));

  if (fallback && process.env[fallback]) return process.env[fallback]!;

  throw new Error(
    'DATABASE_URL is not set (and no *_DATABASE_URL / *_POSTGRES_URL fallback found). ' +
      'Run `vercel env pull .env.local` after connecting Prisma Postgres.',
  );
}
