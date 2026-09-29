import { randInt } from "@/lib/rng";

export type SicBoBetType = "big" | "small" | "anyTriple" | "specificTriple" | "number";

export interface SicBoBet {
  type: SicBoBetType;
  number?: number; // 1-6, required for specificTriple/number
}

export function rollDice(): [number, number, number] {
  return [randInt(1, 6), randInt(1, 6), randInt(1, 6)];
}

export function isTriple(dice: number[]): boolean {
  return dice[0] === dice[1] && dice[1] === dice[2];
}

/** Returns the payout multiplier (0 = loss) for a bet against a given roll. */
export function evaluate(bet: SicBoBet, dice: number[]): number {
  const sum = dice[0] + dice[1] + dice[2];
  const triple = isTriple(dice);

  switch (bet.type) {
    case "big":
      return !triple && sum >= 11 && sum <= 17 ? 2 : 0;
    case "small":
      return !triple && sum >= 4 && sum <= 10 ? 2 : 0;
    case "anyTriple":
      return triple ? 31 : 0;
    case "specificTriple":
      return triple && dice[0] === bet.number ? 181 : 0;
    case "number": {
      const count = dice.filter((d) => d === bet.number).length;
      return count > 0 ? count + 1 : 0; // 1 match pays 2x (1:1 profit), 2 => 3x, 3 => 4x
    }
    default:
      return 0;
  }
}
