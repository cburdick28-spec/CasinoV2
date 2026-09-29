import { shuffle } from "@/lib/rng";

export const KENO_MAX_NUMBER = 40;
export const KENO_DRAW_COUNT = 10;
export const KENO_MAX_PICKS = 10;

// paytable[picks][hits] = payout multiplier of bet.
// Derived from the exact hypergeometric odds of hitting `k` of `picks` numbers
// when 10 are drawn from 40, targeting ~85-95% RTP per pick count (capped at 1000x
// so a single spin can't produce an absurd payout).
export const PAYTABLE: Record<number, number[]> = {
  1: [0, 3.5],
  2: [0, 1, 8],
  3: [0, 0.5, 2.5, 26],
  4: [0, 0.5, 1, 6, 100],
  5: [0, 0, 1, 3, 24, 605],
  6: [0, 0, 0.5, 1.5, 9, 110, 1000],
  7: [0, 0, 0.5, 1, 4, 31, 545, 1000],
  8: [0, 0, 0.5, 1, 2.5, 13, 150, 1000, 1000],
  9: [0, 0, 0, 0.5, 1.5, 7, 60, 970, 1000, 1000],
  10: [0, 0, 0, 0.5, 1, 4.5, 27, 315, 1000, 1000, 1000],
};

export function drawNumbers(): number[] {
  const pool = Array.from({ length: KENO_MAX_NUMBER }, (_, i) => i + 1);
  return shuffle(pool).slice(0, KENO_DRAW_COUNT).sort((a, b) => a - b);
}

export function multiplierFor(picksCount: number, hits: number): number {
  const row = PAYTABLE[picksCount];
  if (!row) return 0;
  return row[hits] ?? 0;
}
