import { describe, it, expect } from 'vitest';
import { buildVoteUrl } from '@/lib/vote-url';

describe('buildVoteUrl', () => {
  it('uses https for a normal public host', () => {
    expect(buildVoteUrl('rv-reindeer-games.vercel.app', null)).toBe(
      'https://rv-reindeer-games.vercel.app/vote',
    );
  });

  it('follows the proxy header when the platform provides one', () => {
    expect(buildVoteUrl('party.example.com', 'http')).toBe('http://party.example.com/vote');
  });

  it('uses only the first value of a comma-separated proxy header', () => {
    expect(buildVoteUrl('party.example.com', 'https,http')).toBe('https://party.example.com/vote');
  });

  it('defaults to http for localhost, keeping the port', () => {
    expect(buildVoteUrl('localhost:3000', null)).toBe('http://localhost:3000/vote');
  });

  it('defaults to http for a laptop on the home network', () => {
    expect(buildVoteUrl('192.168.1.20:3000', null)).toBe('http://192.168.1.20:3000/vote');
  });

  it('returns null when the host is missing', () => {
    expect(buildVoteUrl(null, null)).toBeNull();
    expect(buildVoteUrl('', null)).toBeNull();
  });

  it('returns null for a host that is not a plain host[:port]', () => {
    expect(buildVoteUrl('evil.com/phish?x=', null)).toBeNull();
    expect(buildVoteUrl('user@evil.com', null)).toBeNull();
    expect(buildVoteUrl('two words', null)).toBeNull();
  });

  it('ignores a proxy header that is not http or https', () => {
    expect(buildVoteUrl('party.example.com', 'javascript')).toBe('https://party.example.com/vote');
  });
});
