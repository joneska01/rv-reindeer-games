import { describe, it, expect } from 'vitest';
import {
  IDLE_LINES, UP_NEXT_TAGS, VOTE_CONFIRM, DEMERIT_LINES, pickLine,
} from '@/lib/copy';

const demerits = DEMERIT_LINES.map((fn) => fn('Joneses'));

describe('copy lists', () => {
  it.each([
    ['intermission lines', IDLE_LINES],
    ['up-next quips', UP_NEXT_TAGS],
    ['first-ballot lines', [...VOTE_CONFIRM.first]],
    ['updated-ballot lines', [...VOTE_CONFIRM.updated]],
    ['demerit lines', demerits],
  ])('%s are never empty and never repeat', (_name, lines) => {
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.every((l) => l.trim().length > 0)).toBe(true);
    expect(new Set(lines).size).toBe(lines.length);
  });

  it('names the couple in every demerit line (the toast is about them)', () => {
    expect(demerits.every((l) => l.includes('Joneses'))).toBe(true);
  });

  it('keeps every line short enough to read across a room', () => {
    const all = [...IDLE_LINES, ...UP_NEXT_TAGS, ...VOTE_CONFIRM.first, ...VOTE_CONFIRM.updated, ...demerits];
    expect(all.filter((l) => l.length > 90)).toEqual([]);
  });
});

describe('pickLine', () => {
  it('wraps around so any seed gives a line', () => {
    expect(pickLine(['a', 'b', 'c'], 4)).toBe('b');
    expect(pickLine(['a', 'b', 'c'], -1)).toBe('b');
  });
});
