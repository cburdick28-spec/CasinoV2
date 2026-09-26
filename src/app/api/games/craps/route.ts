import { NextRequest, NextResponse } from "next/server";
import { clampBet, jsonError, requireUser } from "@/lib/api";
import { addMoney, clearGameState, getGameState, recordGame, setGameState } from "@/lib/account";
import { randInt } from "@/lib/rng";
import { MAX_BET } from "@/lib/vip";

const GAME = "craps";

const ODDS_PAYOUT: Record<number, number> = {
  4: 2,
  10: 2,
  5: 1.5,
  9: 1.5,
  6: 1.2,
  8: 1.2,
};

interface CrapsState {
  phase: "come_out" | "point";
  point: number | null;
  bet: number;
  oddsBet: number;
}

export async function GET() {
  const result = await requireUser();
  if ("error" in result) return result.error;
  const state = getGameState<CrapsState>(result.user.id, GAME);
  return NextResponse.json({ state });
}

export async function POST(req: NextRequest) {
  const result = await requireUser();
  if ("error" in result) return result.error;
  const { user, money } = result;
  const body = await req.json().catch(() => null);
  const action = body?.action;

  let state = getGameState<CrapsState>(user.id, GAME);

  if (action === "add_odds") {
    if (!state || state.phase !== "point" || !state.point) return jsonError("No point established");
    const odds = clampBet(body?.amount, money, MAX_BET);
    if (odds === null) return jsonError("Invalid odds amount");
    addMoney(user.id, -odds);
    state.oddsBet += odds;
    setGameState(user.id, GAME, state);
    return NextResponse.json({ state, balance: addMoney(user.id, 0) });
  }

  if (action !== "roll") return jsonError("Unknown action");

  if (!state) {
    const bet = clampBet(body?.bet, money, MAX_BET);
    if (bet === null) return jsonError("Invalid bet amount");
    addMoney(user.id, -bet);
    state = { phase: "come_out", point: null, bet, oddsBet: 0 };
  }

  const d1 = randInt(1, 6);
  const d2 = randInt(1, 6);
  const total = d1 + d2;
  let outcome: "win" | "lose" | "continue" = "continue";
  let payout = 0;
  let message = "";

  if (state.phase === "come_out") {
    if (total === 7 || total === 11) {
      payout = state.bet * 2;
      outcome = "win";
      message = `Natural ${total}! You win!`;
    } else if (total === 2 || total === 3 || total === 12) {
      outcome = "lose";
      message = `Craps! ${total} — you lose.`;
    } else {
      state.phase = "point";
      state.point = total;
      message = `Point set to ${total}!`;
    }
  } else if (state.point) {
    if (total === state.point) {
      const oddsMult = ODDS_PAYOUT[state.point] ?? 1;
      payout = state.bet * 2 + state.oddsBet + Math.floor(state.oddsBet * oddsMult);
      outcome = "win";
      message = `Hit your point ${state.point}! You win!`;
    } else if (total === 7) {
      outcome = "lose";
      message = "Seven out! You lose.";
    } else {
      message = `Rolled ${total} — keep rolling for ${state.point}!`;
    }
  }

  let balance = money;
  if (outcome !== "continue") {
    const totalWagered = state.bet + state.oddsBet;
    balance = addMoney(user.id, payout);
    recordGame(user.id, "\u{1F3B2} Craps", outcome === "win", totalWagered, payout);
    clearGameState(user.id, GAME);
    state = null;
  } else {
    setGameState(user.id, GAME, state);
    balance = addMoney(user.id, 0);
  }

  return NextResponse.json({
    dice: [d1, d2],
    total,
    outcome,
    message,
    payout,
    state,
    balance,
  });
}

export async function DELETE() {
  const result = await requireUser();
  if ("error" in result) return result.error;
  clearGameState(result.user.id, GAME);
  return NextResponse.json({ ok: true });
}
