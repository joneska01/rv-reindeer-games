import { ok } from '@/lib/api';
import { buildScoreboard } from '@/lib/scoreboard';

// Public, always-fresh: the TV polls this every few seconds.
export const dynamic = 'force-dynamic';

export async function GET() {
  const payload = await buildScoreboard();
  return ok(payload);
}
