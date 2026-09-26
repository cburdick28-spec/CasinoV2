import type { Card } from "../types";
import { buildDeck, handValueBlackjack, isBlackjack } from "../cards";

export interface BjHand {
  cards: Card[];
  bet: number;
  finished: boolean;
  doubled: boolean;
  natural: boolean;
  surrendered: boolean;
}

export interface BlackjackState {
  deck: Card[];
  dealer: Card[];
  hands: BjHand[];
  current: number;
  active: boolean;
  insuranceOffered: boolean;
  insuranceResolved: boolean;
  insuranceBet: number;
  stage: "playing" | "done";
}

export function newHand(cards: Card[], bet: number): BjHand {
  return { cards, bet, finished: false, doubled: false, natural: isBlackjack(cards), surrendered: false };
}

export function draw(state: BlackjackState): Card {
  if (state.deck.length < 10) {
    state.deck = buildDeck();
  }
  return state.deck.pop()!;
}

export function dealerPlay(state: BlackjackState) {
  const allBust = state.hands.every((h) => handValueBlackjack(h.cards) > 21 || h.surrendered);
  if (!allBust) {
    while (handValueBlackjack(state.dealer) < 17) {
      state.dealer.push(draw(state));
    }
  }
}

export function canSplit(hand: BjHand): boolean {
  return hand.cards.length === 2 && hand.cards[0].rank === hand.cards[1].rank;
}
