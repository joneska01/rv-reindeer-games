import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import jsQR from 'jsqr';
import { VoteQr } from './VoteQr';

const URL = 'https://rv-reindeer-games.vercel.app/vote';

/** Render the QR to markup, as the TV would. */
function render(url: string): string {
  return renderToStaticMarkup(createElement(VoteQr, { url, size: 256 }));
}

/** [background fill, module fill, module path data] — the two <path>s the library draws. */
function parse(svg: string) {
  const fills = [...svg.matchAll(/<path fill="([^"]+)" d="([^"]+)"/g)];
  expect(fills).toHaveLength(2);
  return { bg: fills[0][1], fg: fills[1][1], modules: fills[1][2] };
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Rasterize the SVG modules (dark on light) into pixels a scanner can read. */
function rasterize(svg: string, scale = 6) {
  const side = Number(/viewBox="0 0 (\d+) \d+"/.exec(svg)![1]);
  const px = side * scale;
  const data = new Uint8ClampedArray(px * px * 4).fill(255);
  const { modules } = parse(svg);
  for (const m of modules.matchAll(/M(\d+)[ ,](\d+)\s*h(\d+)v1H\d+z/g)) {
    const [x, y, w] = [Number(m[1]), Number(m[2]), Number(m[3])];
    for (let py = y * scale; py < (y + 1) * scale; py++) {
      for (let pxx = x * scale; pxx < (x + w) * scale; pxx++) {
        const i = (py * px + pxx) * 4;
        data[i] = data[i + 1] = data[i + 2] = 0;
      }
    }
  }
  return { data, px };
}

describe('VoteQr', () => {
  it('encodes exactly the vote URL (a phone scan lands on /vote)', () => {
    const { data, px } = rasterize(render(URL));
    // dontInvert: the code must read as dark-on-light, the way phone cameras expect.
    const scanned = jsQR(data, px, px, { inversionAttempts: 'dontInvert' });
    expect(scanned?.data).toBe(URL);
  });

  it('keeps the quiet zone around the code so it scans from across a room', () => {
    // 4 empty modules on every side: the first drawn dark module can't be in them.
    const svg = render(URL);
    const side = Number(/viewBox="0 0 (\d+) \d+"/.exec(svg)![1]);
    const xs = [...parse(svg).modules.matchAll(/M(\d+)[ ,](\d+)/g)].flatMap((m) => [Number(m[1]), Number(m[2])]);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(4);
    expect(side).toBeGreaterThan(Math.max(...xs));
  });

  it('uses strongly contrasting colors (never theme gold-on-green)', () => {
    const { bg, fg } = parse(render(URL));
    expect(luminance(bg)).toBeGreaterThan(luminance(fg)); // dark modules on a light field
    expect(contrast(bg, fg)).toBeGreaterThanOrEqual(7);
  });
});
