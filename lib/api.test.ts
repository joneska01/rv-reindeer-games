import { describe, it, expect } from 'vitest';
import { isUniqueViolation } from '@/lib/api';

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
