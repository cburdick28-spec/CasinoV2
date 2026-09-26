import { NextRequest, NextResponse } from "next/server";
import { clampBet, jsonError, requireUser } from "@/lib/api";
import { addMoney, clearGameState, getGameState, recordGame, setGameState } from "@/lib/account";
import { randInt } from "@/lib/rng";
import { MAX_BET } from "@/lib/vip";

const GAME = "higherlower";
const HOUSE_EDGE = 0.95;

interface HLState {
  bet: number;
  pot: number;
  card: number;
  streak: number;
}

function fairMultiplier(card: number, guess: "higher" | "lower"): number {
  const favorable = guess === "higher" ? 13 - card : card - 1;
  if (favorable <= 0) return 0;
  return (13 / favorable) * HOUSE_EDGE;
}

export async function GET() {
  const result = await requireUser();
  if ("error" in result) return result.error;
  const state = getGameState<HLState>(result.user.id, GAME);
  return NextResponse.json({ state });
}

export async function POST(req: NextRequest) {
  const result = await requireUser();
  if ("error" in result) return result.error;
  const { user, money } = result;
  const body = await req.json().catch(() => null);
  const action = body?.action;

  let state = getGameState<HLState>(user.id, GAME);

  if (action === "cashout") {
    if (!state) return jsonError("No active round");
    const payout = Math.floor(state.pot);
    addMoney(user.id, payout);
    recordGame(user.id, "\u{1F53C} Higher Lower", true, state.bet, payout);
    clearGameState(user.id, GAME);
    return NextResponse.json({ cashedOut: true, payout, balance: addMoney(user.id, 0) });
  }

  if (action !== "guess") return jsonError("Unknown action");
  const guess = body?.guess === "lower" ? "lower" : "higher";

  if (!state) {
    const bet = clampBet(body?.bet, money, MAX_BET);
    if (bet === null) return jsonError("Invalid bet amount");
    addMoney(user.id, -bet);
    state = { bet, pot: bet, card: randInt(1, 13), streak: 0 };
  }

  const nextCard = randInt(1, 13);
  const currentCard = state.card;

  if (nextCard === currentCard) {
    state.card = nextCard;
    setGameState(user.id, GAME, state);
    return NextResponse.json({ nextCard, push: true, state, balance: addMoney(user.id, 0) });
  }

  const win =
    (guess === "higher" && nextCard > currentCard) || (guess === "lower" && nextCard < currentCard);

  if (!win) {
    recordGame(user.id, "\u{1F53C} Higher Lower", false, state.bet, 0);
    clearGameState(user.id, GAME);
    return NextResponse.json({ nextCard, win: false, state: null, balance: addMoney(user.id, 0) });
  }

  const mult = fairMultiplier(currentCard, guess);
  state.pot = Math.floor(state.pot * mult);
  state.card = nextCard;
  state.streak += 1;
  setGameState(user.id, GAME, state);
  return NextResponse.json({ nextCard, win: true, state, balance: addMoney(user.id, 0) });
}

export async function DELETE() {
  const result = await requireUser();
  if ("error" in result) return result.error;
  clearGameState(result.user.id, GAME);
  return NextResponse.json({ ok: true });
}
