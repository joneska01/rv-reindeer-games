import { NextResponse } from 'next/server';
import { ZodError, type ZodType } from 'zod';

/** Standard success envelope. */
export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

/** Standard error envelope. */
export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Parse + validate a JSON request body against a Zod schema.
 * Returns `{ data }` on success or `{ response }` (a 422) on failure.
 */
export async function parseBody<T>(
  req: Request,
  schema: ZodType<T>,
): Promise<{ data: T; response?: never } | { data?: never; response: NextResponse }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { response: fail('Expected a JSON body.', 400) };
  }
  try {
    return { data: schema.parse(raw) };
  } catch (e) {
    if (e instanceof ZodError) {
      const first = e.issues[0];
      return { response: fail(first ? `${first.path.join('.')}: ${first.message}` : 'Invalid body.', 422) };
    }
    return { response: fail('Invalid body.', 422) };
  }
}

/** True when a DB error is a Postgres unique-constraint violation (23505).
 *  Drizzle wraps driver errors, so the code may live on `cause`. */
export function isUniqueViolation(e: unknown): boolean {
  const code = (err: unknown) => (err as { code?: string } | null)?.code;
  return code(e) === '23505' || code((e as { cause?: unknown } | null)?.cause) === '23505';
}
