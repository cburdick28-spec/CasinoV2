import { evaluateHand, type HandScore } from "@/lib/poker";
import type { Card } from "@/lib/types";

// Classic 9/6 Jacks-or-Better paytable (multiplier of bet).
export function payoutMultiplier(score: HandScore): number {
  const [category, high] = score;
  switch (category) {
    case 9:
      return 250; // Royal Flush
    case 8:
      return 50; // Straight Flush
    case 7:
      return 25; // Four of a Kind
    case 6:
      return 9; // Full House
    case 5:
      return 6; // Flush
    case 4:
      return 4; // Straight
    case 3:
      return 3; // Three of a Kind
    case 2:
      return 2; // Two Pair
    case 1:
      return high >= 11 ? 1 : 0; // Jacks or Better only
    default:
      return 0;
  }
}

export function evaluateFinalHand(hand: Card[]): { score: HandScore; mult: number } {
  const score = evaluateHand(hand);
  return { score, mult: payoutMultiplier(score) };
}
