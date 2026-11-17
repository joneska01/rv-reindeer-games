import { describe, it, expect } from 'vitest';
import { fmtScore } from '@/lib/format';
import { upNextRule } from '@/lib/copy';

describe('fmtScore', () => {
  it('keeps whole numbers whole', () => {
    expect(fmtScore(17)).toBe('17');
    expect(fmtScore(0)).toBe('0');
  });

  it('shows timed scores to at most two decimals', () => {
    expect(fmtScore(12.5)).toBe('12.5');
    expect(fmtScore(9.256)).toBe('9.26');
  });

  it('does not leak float noise', () => {
    expect(fmtScore(0.1 + 0.2)).toBe('0.3');
  });
});

describe('upNextRule', () => {
  it('tells voters the ballots are open', () => {
    expect(upNextRule({ scoreType: 'high_wins', scoreSource: 'voting', scoreUnit: 'vote points' })).toMatch(/ballots/i);
  });

  it('says fastest time wins for a timed game', () => {
    expect(upNextRule({ scoreType: 'low_wins', scoreSource: 'manual', scoreUnit: 'seconds' })).toBe('Fastest time wins.');
  });

  it('says lowest score wins for a low-wins game that is not timed', () => {
    expect(upNextRule({ scoreType: 'low_wins', scoreSource: 'manual', scoreUnit: 'strikes' })).toBe('Lowest score wins.');
  });

  it('says highest score wins otherwise', () => {
    expect(upNextRule({ scoreType: 'high_wins', scoreSource: 'manual', scoreUnit: 'rings' })).toBe('Highest score wins.');
  });
});
