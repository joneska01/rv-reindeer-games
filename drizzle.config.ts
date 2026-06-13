import type { Config } from 'drizzle-kit';
import { config } from 'dotenv';

// Standalone CLI (not Next.js) — load .env.local, falling back to .env.
config({ path: '.env.local' });
config();

export default {
  schema: './db/schema.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
