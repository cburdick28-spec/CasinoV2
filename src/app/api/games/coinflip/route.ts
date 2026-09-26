import { NextRequest, NextResponse } from "next/server";
import { clampBet, jsonError, requireUser } from "@/lib/api";
import { addMoney, clearGameState, getGameState, recordGame, setGameState } from "@/lib/account";
import { randChoice } from "@/lib/rng";
import { MAX_BET } from "@/lib/vip";

const GAME = "coinflip";
const MULTIPLIER = 1.95; // <2x per correct call keeps a house edge on the streak ladder

interface CoinState {
  bet: number;
  pot: number;
  streak: number;
}

export async function GET() {
  const result = await requireUser();
  if ("error" in result) return result.error;
  const state = getGameState<CoinState>(result.user.id, GAME);
  return NextResponse.json({ state });
}

export async function POST(req: NextRequest) {
  const result = await requireUser();
  if ("error" in result) return result.error;
  const { user, money } = result;
  const body = await req.json().catch(() => null);
  const action = body?.action;
  const side = body?.side === "tails" ? "tails" : "heads";

  let state = getGameState<CoinState>(user.id, GAME);

  if (action === "cashout") {
    if (!state) return jsonError("No active round");
    const payout = Math.floor(state.pot);
    addMoney(user.id, payout);
    recordGame(user.id, "\u{1FA99} Coin Flip", true, state.bet, payout);
    clearGameState(user.id, GAME);
    return NextResponse.json({ cashedOut: true, payout, balance: addMoney(user.id, 0) });
  }

  if (action !== "flip") return jsonError("Unknown action");

  if (!state) {
    const bet = clampBet(body?.bet, money, MAX_BET);
    if (bet === null) return jsonError("Invalid bet amount");
    addMoney(user.id, -bet);
    state = { bet, pot: bet, streak: 0 };
  }

  const result_ = randChoice(["heads", "tails"] as const);
  const win = result_ === side;

  if (!win) {
    recordGame(user.id, "\u{1FA99} Coin Flip", false, state.bet, 0);
    clearGameState(user.id, GAME);
    return NextResponse.json({ result: result_, win: false, state: null, balance: addMoney(user.id, 0) });
  }

  state.pot = Math.floor(state.pot * MULTIPLIER);
  state.streak += 1;
  setGameState(user.id, GAME, state);
  return NextResponse.json({ result: result_, win: true, state, balance: addMoney(user.id, 0) });
}

export async function DELETE() {
  const result = await requireUser();
  if ("error" in result) return result.error;
  clearGameState(result.user.id, GAME);
  return NextResponse.json({ ok: true });
}
