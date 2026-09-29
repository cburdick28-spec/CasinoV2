const HOUSE_EDGE = 0.97;

// Fair-ish weighted segments (weighted average multiplier ≈ 0.92 before the
// house edge below is applied). Higher multipliers are rarer.
const SEGMENT_WEIGHTS: { mult: number; weight: number }[] = [
  { mult: 0, weight: 14 },
  { mult: 0.5, weight: 10 },
  { mult: 1, weight: 10 },
  { mult: 1.5, weight: 6 },
  { mult: 2, weight: 4 },
  { mult: 3, weight: 2 },
  { mult: 5, weight: 1 },
];

/** Deterministic seeded PRNG (mulberry32) so the wheel's slice order is identical on the server and in the client bundle without shipping a hand-shuffled literal. */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildWheelOrder(): number[] {
  const expanded: number[] = [];
  for (const s of SEGMENT_WEIGHTS) {
    for (let i = 0; i < s.weight; i++) expanded.push(s.mult);
  }
  const rand = mulberry32(1337);
  for (let i = expanded.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [expanded[i], expanded[j]] = [expanded[j], expanded[i]];
  }
  return expanded;
}

/** The wheel's fixed slice sequence — same array on server and client. */
export const WHEEL_ORDER: number[] = buildWheelOrder();

export function payoutFor(bet: number, mult: number): number {
  return Math.floor(bet * mult * HOUSE_EDGE);
}
