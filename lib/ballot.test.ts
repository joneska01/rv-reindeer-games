import { describe, it, expect } from 'vitest';
import { EMPTY_SLOTS, tapTeam, rankOf, toBallotPicks, type Slots } from '@/lib/ballot';

describe('tapTeam', () => {
  it('puts the first tap in 1st place', () => {
    expect(tapTeam(EMPTY_SLOTS, 'a')).toEqual(['a', null, null]);
  });

  it('fills 2nd then 3rd as more couples are tapped', () => {
    const s = tapTeam(tapTeam(tapTeam(EMPTY_SLOTS, 'a'), 'b'), 'c');
    expect(s).toEqual(['a', 'b', 'c']);
  });

  it('undoes a pick when the same couple is tapped again', () => {
    expect(tapTeam(['a', 'b', null], 'b')).toEqual(['a', null, null]);
  });

  it('leaves the other picks in their places when one is undone', () => {
    expect(tapTeam(['a', 'b', 'c'], 'a')).toEqual([null, 'b', 'c']);
  });

  it('fills the place that was freed, not the end of the list', () => {
    const afterUndo = tapTeam(['a', 'b', 'c'], 'a');
    expect(tapTeam(afterUndo, 'd')).toEqual(['d', 'b', 'c']);
  });

  it('ignores a fourth couple once all three places are taken', () => {
    expect(tapTeam(['a', 'b', 'c'], 'd')).toEqual(['a', 'b', 'c']);
  });

  it('never mutates the slots it was given', () => {
    const before: Slots = ['a', null, null];
    tapTeam(before, 'b');
    expect(before).toEqual(['a', null, null]);
  });
});

describe('rankOf', () => {
  it('reports 1, 2 or 3 for a picked couple', () => {
    const s: Slots = ['a', 'b', 'c'];
    expect([rankOf(s, 'a'), rankOf(s, 'b'), rankOf(s, 'c')]).toEqual([1, 2, 3]);
  });

  it('reports null for a couple that has not been picked', () => {
    expect(rankOf(['a', null, null], 'z')).toBeNull();
  });
});

describe('toBallotPicks', () => {
  it('turns three picks into the fields the vote API expects', () => {
    expect(toBallotPicks(['a', 'b', 'c'])).toEqual({
      firstPlaceTeamId: 'a',
      secondPlaceTeamId: 'b',
      thirdPlaceTeamId: 'c',
    });
  });

  it('returns null while any place is still empty', () => {
    expect(toBallotPicks(['a', null, 'c'])).toBeNull();
    expect(toBallotPicks(EMPTY_SLOTS)).toBeNull();
  });
});
