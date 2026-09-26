import { NextRequest, NextResponse } from "next/server";
import { clampBet, jsonError, requireUser } from "@/lib/api";
import { addMoney, clearGameState, getGameState, recordGame, setGameState, unlockAchievement } from "@/lib/account";
import { buildDeck, handValueBlackjack, isBlackjack } from "@/lib/cards";
import { MAX_BET } from "@/lib/vip";
import {
  BlackjackState,
  canSplit,
  dealerPlay,
  draw,
  newHand,
} from "@/lib/games/blackjack";
import type { Card } from "@/lib/types";

const GAME = "blackjack";

function serialize(state: BlackjackState, revealDealer: boolean) {
  const showDealer = revealDealer || !state.active;
  return {
    dealer: showDealer ? state.dealer : [state.dealer[0]],
    dealerValue: showDealer ? handValueBlackjack(state.dealer) : null,
    dealerHidden: !showDealer,
    hands: state.hands.map((h) => ({ ...h, value: handValueBlackjack(h.cards) })),
    current: state.current,
    active: state.active,
    insuranceOffered: state.insuranceOffered && !state.insuranceResolved,
  };
}

function settle(state: BlackjackState, userId: number): string[] {
  dealerPlay(state);
  const dealerTotal = handValueBlackjack(state.dealer);
  const dealerBJ = isBlackjack(state.dealer);
  const messages: string[] = [];

  state.hands.forEach((hand, idx) => {
    const label = `Hand ${idx + 1}`;
    if (hand.surrendered) {
      const refund = Math.floor(hand.bet / 2);
      addMoney(userId, refund);
      recordGame(userId, "\u{1F0CF} Blackjack", false, hand.bet, refund);
      messages.push(`${label}: Surrendered — half bet returned ($${refund.toLocaleString()}).`);
      return;
    }
    const total = handValueBlackjack(hand.cards);
    if (hand.natural) {
      if (dealerBJ) {
        addMoney(userId, hand.bet);
        recordGame(userId, "\u{1F0CF} Blackjack", false, hand.bet, hand.bet, true);
        messages.push(`${label}: Push — both blackjack.`);
      } else {
        const win = Math.floor(hand.bet * 2.5);
        addMoney(userId, win);
        recordGame(userId, "\u{1F0CF} Blackjack", true, hand.bet, win);
        unlockAchievement(userId, "blackjack_ace");
        messages.push(`${label}: Blackjack! +$${(win - hand.bet).toLocaleString()}`);
      }
      return;
    }
    if (total > 21) {
      recordGame(userId, "\u{1F0CF} Blackjack", false, hand.bet, 0);
      messages.push(`${label}: Bust — -$${hand.bet.toLocaleString()}`);
      return;
    }
    if (dealerTotal > 21 || total > dealerTotal) {
      const win = hand.bet * 2;
      addMoney(userId, win);
      recordGame(userId, "\u{1F0CF} Blackjack", true, hand.bet, win);
      messages.push(`${label}: Win! +$${hand.bet.toLocaleString()}`);
    } else if (total < dealerTotal) {
      recordGame(userId, "\u{1F0CF} Blackjack", false, hand.bet, 0);
      messages.push(`${label}: Dealer wins — -$${hand.bet.toLocaleString()}`);
    } else {
      addMoney(userId, hand.bet);
      recordGame(userId, "\u{1F0CF} Blackjack", false, hand.bet, hand.bet, true);
      messages.push(`${label}: Push — bet returned.`);
    }
  });

  state.active = false;
  state.stage = "done";
  return messages;
}

function advance(state: BlackjackState, userId: number): string[] {
  let next = state.current + 1;
  while (next < state.hands.length && state.hands[next].finished) next++;
  if (next >= state.hands.length) {
    return settle(state, userId);
  }
  state.current = next;
  return [];
}

export async function GET() {
  const result = await requireUser();
  if ("error" in result) return result.error;
  const state = getGameState<BlackjackState>(result.user.id, GAME);
  if (!state) return NextResponse.json({ state: null });
  return NextResponse.json({ state: serialize(state, !state.active), messages: [] });
}

export async function POST(req: NextRequest) {
  const result = await requireUser();
  if ("error" in result) return result.error;
  const { user, money } = result;
  const body = await req.json().catch(() => null);
  const action = body?.action;

  let state = getGameState<BlackjackState>(user.id, GAME);

  if (action === "deal") {
    const bet = clampBet(body?.bet, money, MAX_BET);
    if (bet === null) return jsonError("Invalid bet amount");
    const deck: Card[] = buildDeck();
    const player = [deck.pop()!, deck.pop()!];
    const dealer = [deck.pop()!, deck.pop()!];
    addMoney(user.id, -bet);
    state = {
      deck,
      dealer,
      hands: [newHand(player, bet)],
      current: 0,
      active: true,
      insuranceOffered: dealer[0].rank === "A",
      insuranceResolved: false,
      insuranceBet: 0,
      stage: "playing",
    };
    let messages: string[] = [];
    if (isBlackjack(player) || isBlackjack(dealer)) {
      state.hands[0].finished = true;
      messages = settle(state, user.id);
    }
    setGameState(user.id, GAME, state);
    return NextResponse.json({ state: serialize(state, !state.active), messages, balance: addMoney(user.id, 0) });
  }

  if (!state || !state.active) return jsonError("No active hand — deal first.");

  const hand = state.hands[state.current];
  if (!hand || hand.finished) return jsonError("No active hand to act on.");

  if (action === "insurance") {
    if (!state.insuranceOffered || state.insuranceResolved) return jsonError("Insurance not available");
    const take = !!body?.take;
    state.insuranceResolved = true;
    if (take) {
      const insBet = Math.floor(hand.bet / 2);
      if (insBet > money) return jsonError("Not enough balance for insurance");
      addMoney(user.id, -insBet);
      state.insuranceBet = insBet;
      if (isBlackjack(state.dealer)) {
        addMoney(user.id, insBet * 3);
      }
    }
    if (isBlackjack(state.dealer)) {
      hand.finished = true;
      const messages = settle(state, user.id);
      setGameState(user.id, GAME, state);
      return NextResponse.json({ state: serialize(state, true), messages, balance: addMoney(user.id, 0) });
    }
    setGameState(user.id, GAME, state);
    return NextResponse.json({ state: serialize(state, false), messages: [], balance: addMoney(user.id, 0) });
  }

  if (action === "hit") {
    hand.cards.push(draw(state));
    let messages: string[] = [];
    if (handValueBlackjack(hand.cards) >= 21) {
      hand.finished = true;
      messages = advance(state, user.id);
    }
    setGameState(user.id, GAME, state);
    return NextResponse.json({ state: serialize(state, !state.active), messages, balance: addMoney(user.id, 0) });
  }

  if (action === "stand") {
    hand.finished = true;
    const messages = advance(state, user.id);
    setGameState(user.id, GAME, state);
    return NextResponse.json({ state: serialize(state, !state.active), messages, balance: addMoney(user.id, 0) });
  }

  if (action === "double") {
    if (hand.cards.length !== 2 || hand.doubled) return jsonError("Cannot double now");
    if (hand.bet > money) return jsonError("Not enough balance to double");
    addMoney(user.id, -hand.bet);
    hand.bet *= 2;
    hand.doubled = true;
    hand.cards.push(draw(state));
    hand.finished = true;
    const messages = advance(state, user.id);
    setGameState(user.id, GAME, state);
    return NextResponse.json({ state: serialize(state, !state.active), messages, balance: addMoney(user.id, 0) });
  }

  if (action === "surrender") {
    if (hand.cards.length !== 2 || state.hands.length > 1) return jsonError("Cannot surrender now");
    hand.surrendered = true;
    hand.finished = true;
    const messages = advance(state, user.id);
    setGameState(user.id, GAME, state);
    return NextResponse.json({ state: serialize(state, !state.active), messages, balance: addMoney(user.id, 0) });
  }

  if (action === "split") {
    if (!canSplit(hand) || state.hands.length >= 4) return jsonError("Cannot split now");
    if (hand.bet > money) return jsonError("Not enough balance to split");
    addMoney(user.id, -hand.bet);
    const [first, second] = hand.cards;
    const handOne = newHand([first, draw(state)], hand.bet);
    const handTwo = newHand([second, draw(state)], hand.bet);
    handOne.natural = false;
    handTwo.natural = false;
    state.hands.splice(state.current, 1, handOne, handTwo);
    setGameState(user.id, GAME, state);
    return NextResponse.json({ state: serialize(state, false), messages: [], balance: addMoney(user.id, 0) });
  }

  return jsonError("Unknown action");
}

export async function DELETE() {
  const result = await requireUser();
  if ("error" in result) return result.error;
  clearGameState(result.user.id, GAME);
  return NextResponse.json({ ok: true });
}
