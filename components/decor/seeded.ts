/**
 * Deterministic pseudo-random in [0,1) for the decor layers (snow, confetti,
 * bubbles). No runtime randomness means the server and browser render identical
 * markup, so there is no hydration mismatch. Rounded to 6 decimals so the tiny
 * last-digit differences between Node's and the browser's `Math.sin` can't leak
 * into the output: every downstream +, −, × is then bit-identical.
 */
export function seeded(i: number, salt: number): number {
  const x = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return Math.round((x - Math.floor(x)) * 1e6) / 1e6;
}
