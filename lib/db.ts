import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/db/schema';
import { resolveDatabaseUrl } from '@/lib/db-url';

const connectionString = resolveDatabaseUrl();

// Singleton connection — prevents connection pool exhaustion in Next.js dev (hot reload)
const globalForDb = globalThis as unknown as { _pgClient?: ReturnType<typeof postgres> };
if (!globalForDb._pgClient) {
  globalForDb._pgClient = postgres(connectionString, { max: 10 });
}

export const db = drizzle(globalForDb._pgClient, { schema });
