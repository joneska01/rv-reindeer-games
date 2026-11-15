import { describe, it, expect, vi } from 'vitest';
import { isUniqueViolation, ApiError, assertUnlocked, toErrorResponse } from '@/lib/api';

describe('isUniqueViolation', () => {
  it('detects a raw Postgres unique violation', () => {
    expect(isUniqueViolation({ code: '23505' })).toBe(true);
  });
  it('detects one wrapped by Drizzle (code on cause)', () => {
    expect(isUniqueViolation(new Error('Failed query', { cause: { code: '23505' } }))).toBe(true);
  });
  it('does not mistake other failures for a duplicate name', () => {
    expect(isUniqueViolation({ code: 'ECONNRESET' })).toBe(false);
    expect(isUniqueViolation(new Error('connection terminated'))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
  });
});

describe('assertUnlocked', () => {
  it('passes for an open edition', () => {
    expect(() => assertUnlocked({ isLocked: false })).not.toThrow();
  });
  it('throws a 423 for a locked edition', () => {
    try {
      assertUnlocked({ isLocked: true });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).status).toBe(423);
    }
  });
});

describe('toErrorResponse', () => {
  it('keeps an ApiError\'s status and message', async () => {
    const res = toErrorResponse(new ApiError(404, 'Game not found.'));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Game not found.' });
  });
  it('turns any other failure into a JSON 500', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = toErrorResponse(new Error('connection terminated'));
    expect(res.status).toBe(500);
    expect(typeof (await res.json()).error).toBe('string');
    spy.mockRestore();
  });
});
