import { describe, it, expect } from 'vitest';
import { toTeamVM, toGameVM, toLibraryGameVM, toStandingVM } from '@/lib/view-models';
import type { Team, Game, GameLibrary } from '@/db/schema';
import type { RankedTeam } from '@/lib/scoring';

describe('view-model mappers', () => {
  it('team: displayColor becomes color, nothing else leaks', () => {
    const t = { id: 't1', yearId: 'y', name: 'Murphys', displayColor: '#C41E3A', createdAt: new Date() } as Team;
    expect(toTeamVM(t)).toEqual({ id: 't1', name: 'Murphys', color: '#C41E3A' });
  });

  it('game: carries the scoring fields (incl. description) and drops DB-only ones', () => {
    const g = {
      id: 'g1', yearId: 'y', libraryGameId: null, name: 'Ring Toss', instructions: 'secret host notes',
      scoringDescription: 'Most rings', scoreType: 'high_wins', scoreSource: 'manual', scoreUnit: 'rings',
      numRounds: 2, roundCombineMethod: 'sum', sortOrder: 3, isComplete: true,
      completedAt: new Date(), createdAt: new Date(),
    } as Game;
    const vm = toGameVM(g);
    expect(vm).toEqual({
      id: 'g1', name: 'Ring Toss', scoringDescription: 'Most rings', scoreType: 'high_wins',
      scoreSource: 'manual', scoreUnit: 'rings', numRounds: 2, roundCombineMethod: 'sum', isComplete: true,
    });
    expect(vm).not.toHaveProperty('instructions'); // host-only text never ships to the client
  });

  it('library game: keeps supplies and notes', () => {
    const l = {
      id: 'l1', name: 'Fishing', instructions: '', scoringDescription: '', scoreType: 'low_wins',
      scoreSource: 'manual', scoreUnit: 'seconds', defaultNumRounds: 2, supplies: 'rods', notes: 'wet',
      createdAt: new Date(),
    } as GameLibrary;
    expect(toLibraryGameVM(l)).toMatchObject({ supplies: 'rods', notes: 'wet', defaultNumRounds: 2 });
  });

  it('standing: partyFoulCount is exposed as foulCount', () => {
    const r: RankedTeam = {
      teamId: 't1', rank: 2, totalPoints: 54, partyFoulCount: 3, gamesCompleted: 2,
      isTied: true, unresolvedTie: false,
    };
    expect(toStandingVM(r)).toEqual({
      teamId: 't1', rank: 2, totalPoints: 54, foulCount: 3, gamesCompleted: 2, isTied: true, unresolvedTie: false,
    });
  });
});
