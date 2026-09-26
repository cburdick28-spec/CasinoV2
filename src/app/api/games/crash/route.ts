import { NextRequest, NextResponse } from "next/server";
import { clampBet, jsonError, requireUser } from "@/lib/api";
import { addMoney, clearGameState, getGameState, recordGame, setGameState, unlockAchievement } from "@/lib/account";
import { generateCrashPoint, multiplierAt } from "@/lib/games/crash";
import { MAX_BET } from "@/lib/vip";

const GAME = "crash";

interface CrashState {
  bet: number;
  crashPoint: number;
  startTime: number;
}

export async function GET() {
  const result = await requireUser();
  if ("error" in result) return result.error;
  const state = getGameState<CrashState>(result.user.id, GAME);
  if (!state) return NextResponse.json({ state: null });
  const elapsed = Date.now() - state.startTime;
  const mult = multiplierAt(elapsed);
  if (mult >= state.crashPoint) {
    recordGame(result.user.id, "\u{1F680} Crash", false, state.bet, 0);
    clearGameState(result.user.id, GAME);
    return NextResponse.json({ state: null, crashed: true, crashPoint: state.crashPoint });
  }
  return NextResponse.json({ state: { bet: state.bet, multiplier: mult } });
}

export async function POST(req: NextRequest) {
  const result = await requireUser();
  if ("error" in result) return result.error;
  const { user, money } = result;
  const body = await req.json().catch(() => null);
  const action = body?.action;

  if (action === "bet") {
    const existing = getGameState<CrashState>(user.id, GAME);
    if (existing) return jsonError("Round already in progress");
    const bet = clampBet(body?.bet, money, MAX_BET);
    if (bet === null) return jsonError("Invalid bet amount");
    addMoney(user.id, -bet);
    const state: CrashState = { bet, crashPoint: generateCrashPoint(), startTime: Date.now() };
    setGameState(user.id, GAME, state);
    return NextResponse.json({ started: true, balance: addMoney(user.id, 0) });
  }

  if (action === "cashout") {
    const state = getGameState<CrashState>(user.id, GAME);
    if (!state) return jsonError("No active round");
    const elapsed = Date.now() - state.startTime;
    const mult = multiplierAt(elapsed);
    clearGameState(user.id, GAME);

    if (mult >= state.crashPoint) {
      recordGame(user.id, "\u{1F680} Crash", false, state.bet, 0);
      return NextResponse.json({
        crashed: true,
        crashPoint: state.crashPoint,
        balance: addMoney(user.id, 0),
      });
    }

    const payout = Math.floor(state.bet * mult);
    addMoney(user.id, payout);
    recordGame(user.id, "\u{1F680} Crash", true, state.bet, payout);
    if (mult >= 10) unlockAchievement(user.id, "crash_10x");
    return NextResponse.json({
      crashed: false,
      cashedOutAt: mult,
      payout,
      balance: addMoney(user.id, 0),
    });
  }

  return jsonError("Unknown action");
}

export async function DELETE() {
  const result = await requireUser();
  if ("error" in result) return result.error;
  clearGameState(result.user.id, GAME);
  return NextResponse.json({ ok: true });
}
