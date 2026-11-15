import { getIronSession, type IronSession, type SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';

export interface SessionData {
  isAdmin: boolean;
}

const DEV_FALLBACK_SECRET = 'dev-only-secret-not-for-production-use-0123456789';

/**
 * In production a missing/short SESSION_SECRET is a hard error — otherwise the
 * fallback below (which is public in this repo) would let anyone mint an admin
 * cookie. Checked lazily so `next build` doesn't need runtime env vars.
 */
function sessionOptions(): SessionOptions {
  const secret = process.env.SESSION_SECRET;
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd && (!secret || secret.length < 32)) {
    throw new Error('SESSION_SECRET must be set to a 32+ character string in production.');
  }
  return {
    cookieName: 'rv_session',
    password: secret || DEV_FALLBACK_SECRET,
    ttl: 60 * 60 * 24, // 24 hours
    cookieOptions: {
      secure: isProd,
      httpOnly: true,
      sameSite: 'lax',
    },
  };
}

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions());
}
