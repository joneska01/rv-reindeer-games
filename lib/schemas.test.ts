import { describe, it, expect } from 'vitest';
import {
  createGameSchema,
  patchGameSchema,
  createLibraryGameSchema,
  patchLibraryGameSchema,
  createTeamSchema,
  patchTeamSchema,
  patchYearSchema,
} from '@/lib/schemas';

const uuid = '11111111-1111-4111-8111-111111111111';

describe('PATCH schemas never inject defaults', () => {
  // A rename must send ONLY the name — anything else would overwrite saved data.
  it('game', () => expect(patchGameSchema.parse({ name: 'Ring Toss' })).toEqual({ name: 'Ring Toss' }));
  it('library game', () =>
    expect(patchLibraryGameSchema.parse({ name: 'Ring Toss' })).toEqual({ name: 'Ring Toss' }));
  it('team', () => expect(patchTeamSchema.parse({})).toEqual({}));
  it('year', () => expect(patchYearSchema.parse({})).toEqual({}));
});

describe('CREATE schemas fill in defaults', () => {
  it('game: only name, yearId, scoring kind required', () => {
    const g = createGameSchema.parse({
      yearId: uuid,
      name: 'Ring Toss',
      scoreType: 'high_wins',
      scoreSource: 'manual',
    });
    expect(g).toMatchObject({
      instructions: '',
      scoringDescription: '',
      scoreUnit: 'points',
      numRounds: 1,
      roundCombineMethod: 'sum',
    });
  });
  it('game: scoring kind is required (no silent default)', () => {
    expect(createGameSchema.safeParse({ yearId: uuid, name: 'x' }).success).toBe(false);
  });
  it('library game: a bare name is enough', () => {
    expect(createLibraryGameSchema.parse({ name: 'Ring Toss' })).toMatchObject({
      scoreType: 'high_wins',
      scoreSource: 'manual',
      defaultNumRounds: 1,
      supplies: '',
      notes: '',
    });
  });
  it('team: color defaults, and a bad hex is rejected on create and patch', () => {
    expect(createTeamSchema.parse({ yearId: uuid, name: 'Murphys' }).displayColor).toBe('#C41E3A');
    expect(createTeamSchema.safeParse({ yearId: uuid, name: 'x', displayColor: 'red' }).success).toBe(false);
    expect(patchTeamSchema.safeParse({ displayColor: 'red' }).success).toBe(false);
  });
});

describe('enum values come from the database enums', () => {
  it('rejects an unknown scoring source', () => {
    expect(patchGameSchema.safeParse({ scoreSource: 'telepathy' }).success).toBe(false);
  });
  it('rejects an unknown display mode', () => {
    expect(patchYearSchema.safeParse({ displayMode: 'disco' }).success).toBe(false);
  });
});
