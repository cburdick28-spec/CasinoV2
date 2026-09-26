import { shuffle } from "./rng";
import type { Card, Rank, Suit } from "./types";

export const SUITS: Suit[] = ["S", "H", "D", "C"];
export const RANKS: Rank[] = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
  "A",
];

export const SUIT_SYMBOL: Record<Suit, string> = {
  S: "♠",
  H: "♥",
  D: "♦",
  C: "♣",
};

export function buildDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  return shuffle(deck);
}

export function cardValueBlackjack(card: Card): number {
  if (card.rank === "A") return 11;
  if (["J", "Q", "K"].includes(card.rank)) return 10;
  return parseInt(card.rank, 10);
}

export function handValueBlackjack(hand: Card[]): number {
  let total = hand.reduce((sum, c) => sum + cardValueBlackjack(c), 0);
  let aces = hand.filter((c) => c.rank === "A").length;
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return total;
}

export function isBlackjack(hand: Card[]): boolean {
  return hand.length === 2 && handValueBlackjack(hand) === 21;
}

export function isSoft17(hand: Card[]): boolean {
  const total = handValueBlackjack(hand);
  if (total !== 17) return false;
  // soft if using an ace as 11
  let sum = hand.reduce((s, c) => s + cardValueBlackjack(c), 0);
  let aces = hand.filter((c) => c.rank === "A").length;
  while (sum > 21 && aces > 0) {
    sum -= 10;
    aces -= 1;
  }
  return sum === total && hand.some((c) => c.rank === "A") && aces > 0;
}

export const RANK_VALUE: Record<Rank, number> = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

export function baccaratValue(card: Card): number {
  if (["10", "J", "Q", "K"].includes(card.rank)) return 0;
  if (card.rank === "A") return 1;
  return parseInt(card.rank, 10);
}

export function baccaratHandTotal(hand: Card[]): number {
  return hand.reduce((sum, c) => sum + baccaratValue(c), 0) % 10;
}
