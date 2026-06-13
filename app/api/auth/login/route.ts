import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const password = String(body?.password ?? '');
  const expected = process.env.ADMIN_PASSWORD ?? '';

  // Constant-time compare; guard length first (timingSafeEqual throws on mismatch).
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  const ok = expected.length > 0 && a.length === b.length && timingSafeEqual(a, b);

  if (!ok) {
    return NextResponse.json({ error: 'That password is not on the guest list.' }, { status: 401 });
  }

  const session = await getSession();
  session.isAdmin = true;
  await session.save();
  return NextResponse.json({ ok: true });
}
