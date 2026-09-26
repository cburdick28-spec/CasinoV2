import type { Card } from "./types";
import { RANK_VALUE } from "./cards";

export const HAND_NAMES = [
  "High Card",
  "Pair",
  "Two Pair",
  "Three of a Kind",
  "Straight",
  "Flush",
  "Full House",
  "Four of a Kind",
  "Straight Flush",
  "Royal Flush",
];

export type HandScore = [number, ...number[]];

function combinations<T>(arr: T[], k: number): T[][] {
  const results: T[][] = [];
  const combo: T[] = [];
  function go(start: number) {
    if (combo.length === k) {
      results.push([...combo]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      go(i + 1);
      combo.pop();
    }
  }
  go(0);
  return results;
}

function scoreFive(hand: Card[]): HandScore {
  let ranks = hand.map((c) => RANK_VALUE[c.rank]).sort((a, b) => b - a);
  const suits = hand.map((c) => c.suit);
  const counts = new Map<number, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
  const freq = [...counts.values()].sort((a, b) => b - a);
  const isFlush = new Set(suits).size === 1;
  let isStraight = new Set(ranks).size === 5 && ranks[0] - ranks[4] === 4;
  const rankSet = new Set(ranks);
  if ([14, 2, 3, 4, 5].every((r) => rankSet.has(r)) && rankSet.size === 5) {
    isStraight = true;
    ranks = [5, 4, 3, 2, 1];
  }

  const byCount = (count: number) =>
    [...counts.entries()].filter(([, c]) => c === count).map(([r]) => r).sort((a, b) => b - a);

  if (isStraight && isFlush) {
    return ranks[0] === 14 ? [9, ...ranks] : [8, ...ranks];
  }
  if (freq[0] === 4) {
    const quad = byCount(4)[0];
    const kicker = byCount(1);
    return [7, quad, ...kicker];
  }
  if (freq[0] === 3 && freq[1] === 2) {
    return [6, byCount(3)[0], byCount(2)[0]];
  }
  if (isFlush) return [5, ...ranks];
  if (isStraight) return [4, ...ranks];
  if (freq[0] === 3) {
    return [3, byCount(3)[0], ...byCount(1)];
  }
  if (freq[0] === 2 && freq[1] === 2) {
    const pairs = byCount(2);
    return [2, ...pairs, ...byCount(1)];
  }
  if (freq[0] === 2) {
    return [1, byCount(2)[0], ...byCount(1)];
  }
  return [0, ...ranks];
}

function compareScores(a: HandScore, b: HandScore): number {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const av = a[i] ?? -1;
    const bv = b[i] ?? -1;
    if (av !== bv) return av - bv;
  }
  return 0;
}

export function evaluateHand(cards: Card[]): HandScore {
  const combos = combinations(cards, 5);
  let best = scoreFive(combos[0]);
  for (const combo of combos.slice(1)) {
    const s = scoreFive(combo);
    if (compareScores(s, best) > 0) best = s;
  }
  return best;
}

export function handName(score: HandScore): string {
  return HAND_NAMES[score[0]] ?? "High Card";
}

export { compareScores };
