/**
 * Side-effect module: loads env vars for standalone CLI scripts (seed, etc.).
 * Import this FIRST, before any module that reads process.env (e.g. @/lib/db) —
 * ES imports evaluate in order, so this guarantees env is populated first.
 *
 * Prefers .env.local (where `vercel env pull` writes), falls back to .env.
 */
import { config } from 'dotenv';

config({ path: '.env.local' });
config();
