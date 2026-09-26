import { randFloat } from "../rng";

const HOUSE_EDGE = 0.99;

/** Standard provably-fair-style crash point distribution with a small house edge. */
export function generateCrashPoint(): number {
  const r = randFloat();
  if (r < 0.02) return 1.0; // ~2% instant crash
  const point = HOUSE_EDGE / (1 - r);
  return Math.max(1.0, Math.floor(point * 100) / 100);
}

/** Deterministic multiplier as a function of elapsed milliseconds. */
export function multiplierAt(elapsedMs: number): number {
  const seconds = elapsedMs / 1000;
  const mult = Math.pow(1.06, seconds * 10);
  return Math.round(mult * 100) / 100;
}
