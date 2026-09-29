import { randFloat } from "@/lib/rng";

const HOUSE_EDGE = 0.97;
export const MIN_TARGET = 1.01;
export const MAX_TARGET = 1_000_000;

/**
 * Classic provably-fair "crash point" formula: for any target, P(roll >= target) = HOUSE_EDGE / target,
 * which keeps the expected payout at HOUSE_EDGE regardless of the chosen target.
 */
export function rollResult(): number {
  const u = randFloat(); // [0, 1)
  const raw = HOUSE_EDGE / (1 - u);
  const clamped = Math.max(1, raw);
  return Math.floor(clamped * 100) / 100;
}

export function isValidTarget(target: number): boolean {
  return Number.isFinite(target) && target >= MIN_TARGET && target <= MAX_TARGET;
}
