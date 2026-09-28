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
  const state = await getGameState<HLState>(result.user.id, GAME);
  return NextResponse.json({ state });
}

export async function POST(req: NextRequest) {
  const result = await requireUser();
  if ("error" in result) return result.error;
  const { user, money } = result;
  const body = await req.json().catch(() => null);
  const action = body?.action;

  let state = await getGameState<HLState>(user.id, GAME);

  if (action === "cashout") {
    if (!state) return jsonError("No active round");
    const payout = Math.floor(state.pot);
    await addMoney(user.id, payout);
    await recordGame(user.id, "\u{1F53C} Higher Lower", true, state.bet, payout);
    await clearGameState(user.id, GAME);
    return NextResponse.json({ cashedOut: true, payout, balance: await addMoney(user.id, 0) });
  }

  if (action !== "guess") return jsonError("Unknown action");
  const guess = body?.guess === "lower" ? "lower" : "higher";

  if (!state) {
    const bet = clampBet(body?.bet, money, MAX_BET);
    if (bet === null) return jsonError("Invalid bet amount");
    await addMoney(user.id, -bet);
    state = { bet, pot: bet, card: randInt(1, 13), streak: 0 };
  }

  const nextCard = randInt(1, 13);
  const currentCard = state.card;

  if (nextCard === currentCard) {
    state.card = nextCard;
    await setGameState(user.id, GAME, state);
    return NextResponse.json({ nextCard, push: true, state, balance: await addMoney(user.id, 0) });
  }

  const win =
    (guess === "higher" && nextCard > currentCard) || (guess === "lower" && nextCard < currentCard);

  if (!win) {
    await recordGame(user.id, "\u{1F53C} Higher Lower", false, state.bet, 0);
    await clearGameState(user.id, GAME);
    return NextResponse.json({ nextCard, win: false, state: null, balance: await addMoney(user.id, 0) });
  }

  const mult = fairMultiplier(currentCard, guess);
  state.pot = Math.floor(state.pot * mult);
  state.card = nextCard;
  state.streak += 1;
  await setGameState(user.id, GAME, state);
  return NextResponse.json({ nextCard, win: true, state, balance: await addMoney(user.id, 0) });
}

export async function DELETE() {
  const result = await requireUser();
  if ("error" in result) return result.error;
  await clearGameState(result.user.id, GAME);
  return NextResponse.json({ ok: true });
}
