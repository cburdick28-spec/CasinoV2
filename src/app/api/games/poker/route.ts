import { NextRequest, NextResponse } from "next/server";
import { clampBet, jsonError, requireUser } from "@/lib/api";
import { addMoney, clearGameState, getGameState, recordGame, setGameState, unlockAchievement } from "@/lib/account";
import { buildDeck } from "@/lib/cards";
import { evaluateHand, handName } from "@/lib/poker";
import { MAX_BET } from "@/lib/vip";
import type { Card } from "@/lib/types";

const GAME = "poker";

type Stage = "preflop" | "flop" | "turn" | "river" | "result";

interface PokerState {
  deck: Card[];
  player: Card[];
  dealer: Card[];
  community: Card[];
  bet: number;
  pot: number;
  stage: Stage;
}

function serialize(state: PokerState, reveal: boolean) {
  return {
    player: state.player,
    dealer: reveal ? state.dealer : state.dealer.map(() => null),
    community: state.community,
    pot: state.pot,
    bet: state.bet,
    stage: state.stage,
  };
}

const NEXT: Record<Stage, Stage> = {
  preflop: "flop",
  flop: "turn",
  turn: "river",
  river: "result",
  result: "result",
};

export async function GET() {
  const result = await requireUser();
  if ("error" in result) return result.error;
  const state = getGameState<PokerState>(result.user.id, GAME);
  if (!state) return NextResponse.json({ state: null });
  return NextResponse.json({ state: serialize(state, state.stage === "result") });
}

export async function POST(req: NextRequest) {
  const result = await requireUser();
  if ("error" in result) return result.error;
  const { user, money } = result;
  const body = await req.json().catch(() => null);
  const action = body?.action;

  let state = getGameState<PokerState>(user.id, GAME);

  if (action === "deal") {
    const bet = clampBet(body?.bet, money, MAX_BET);
    if (bet === null) return jsonError("Invalid ante amount");
    const deck = buildDeck();
    const player = [deck.pop()!, deck.pop()!];
    const dealer = [deck.pop()!, deck.pop()!];
    addMoney(user.id, -bet);
    state = { deck, player, dealer, community: [], bet, pot: bet * 2, stage: "preflop" };
    setGameState(user.id, GAME, state);
    return NextResponse.json({ state: serialize(state, false), balance: addMoney(user.id, 0) });
  }

  if (!state) return jsonError("No active hand — deal first.");

  if (action === "fold") {
    const netLoss = state.bet;
    recordGame(user.id, "♠️ Poker", false, netLoss, 0);
    clearGameState(user.id, GAME);
    return NextResponse.json({ folded: true, net: netLoss, balance: addMoney(user.id, 0) });
  }

  if (action === "raise") {
    const raise = clampBet(body?.amount, money, MAX_BET);
    if (raise === null) return jsonError("Invalid raise amount");
    addMoney(user.id, -raise);
    state.pot += raise;
    state.bet += raise;
  } else if (action !== "check") {
    return jsonError("Unknown action");
  }

  if (state.stage === "preflop") {
    state.community = [state.deck.pop()!, state.deck.pop()!, state.deck.pop()!];
  } else if (state.stage === "flop") {
    state.community.push(state.deck.pop()!);
  } else if (state.stage === "turn") {
    state.community.push(state.deck.pop()!);
  }

  state.stage = NEXT[state.stage];

  if (state.stage === "result") {
    const playerScore = evaluateHand([...state.player, ...state.community]);
    const dealerScore = evaluateHand([...state.dealer, ...state.community]);
    const pName = handName(playerScore);
    const dName = handName(dealerScore);
    let outcome: "win" | "lose" | "chop";
    let net = 0;

    const cmp = playerScore.length && dealerScore.length ? compare(playerScore, dealerScore) : 0;
    if (cmp > 0) {
      addMoney(user.id, state.pot);
      net = state.pot - state.bet;
      outcome = "win";
      recordGame(user.id, "♠️ Poker", true, state.bet, state.pot);
      if (pName === "Royal Flush") unlockAchievement(user.id, "royal_flush");
    } else if (cmp < 0) {
      outcome = "lose";
      net = state.bet;
      recordGame(user.id, "♠️ Poker", false, state.bet, 0);
    } else {
      addMoney(user.id, state.bet);
      outcome = "chop";
      net = 0;
    }

    const finalState = { ...state };
    clearGameState(user.id, GAME);
    return NextResponse.json({
      state: serialize(finalState, true),
      result: { outcome, net, playerHand: pName, dealerHand: dName },
      balance: addMoney(user.id, 0),
    });
  }

  setGameState(user.id, GAME, state);
  return NextResponse.json({ state: serialize(state, false), balance: addMoney(user.id, 0) });
}

function compare(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const av = a[i] ?? -1;
    const bv = b[i] ?? -1;
    if (av !== bv) return av - bv;
  }
  return 0;
}

export async function DELETE() {
  const result = await requireUser();
  if ("error" in result) return result.error;
  clearGameState(result.user.id, GAME);
  return NextResponse.json({ ok: true });
}
