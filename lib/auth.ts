import { getIronSession, type IronSession, type SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export interface SessionData {
  isAdmin: boolean;
}

const SESSION_OPTIONS: SessionOptions = {
  cookieName: 'rv_session',
  password: process.env.SESSION_SECRET ?? 'fallback-dev-secret-change-in-production',
  ttl: 60 * 60 * 24, // 24 hours
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, SESSION_OPTIONS);
}

/** Use in API route handlers — returns 401 if not admin */
export async function requireAdmin(
  req: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>,
): Promise<NextResponse> {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return handler(req);
}
