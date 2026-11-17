/** Whole numbers stay whole; timed scores show up to 2 decimals (no float noise). */
export function fmtScore(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
}
