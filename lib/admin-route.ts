import 'server-only';
import type { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { fail, toErrorResponse } from '@/lib/api';

/**
 * Wrap an admin route handler: 401 unless signed in, and any error — an
 * `ApiError` thrown by a guard or a real failure — comes back as JSON.
 *
 *   export const POST = adminRoute(async (req) => { … });
 *   export const PATCH = adminRoute<{ id: string }>(async (req, { id }) => { … });
 */
export function adminRoute<P extends Record<string, string> = Record<string, never>>(
  handler: (req: NextRequest, params: P) => Promise<NextResponse>,
) {
  return async (req: NextRequest, ctx: { params: Promise<P> }): Promise<NextResponse> => {
    try {
      const session = await getSession();
      if (!session.isAdmin) return fail('Unauthorized', 401);
      return await handler(req, await ctx.params);
    } catch (e) {
      return toErrorResponse(e);
    }
  };
}
