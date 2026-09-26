import { NextRequest, NextResponse } from "next/server";
import { clampBet, jsonError, requireUser } from "@/lib/api";
import { addMoney, clearGameState, deductBet, getGameState, isDevAccount, recordGame, setGameState, unlockAchievement } from "@/lib/account";
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
  const state = await getGameState<CrashState>(result.user.id, GAME);
  if (!state) return NextResponse.json({ state: null });
  const elapsed = Date.now() - state.startTime;
  const mult = multiplierAt(elapsed);
  if (mult >= state.crashPoint) {
    await recordGame(result.user.id, "\u{1F680} Crash", false, state.bet, 0);
    await clearGameState(result.user.id, GAME);
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
    const existing = await getGameState<CrashState>(user.id, GAME);
    if (existing) return jsonError("Round already in progress");
    const bet = clampBet(body?.bet, money, MAX_BET);
    if (bet === null) return jsonError("Invalid bet amount");
    if (!(await deductBet(user.id, bet, isDevAccount(user)))) return jsonError("Not enough balance");
    const state: CrashState = { bet, crashPoint: generateCrashPoint(), startTime: Date.now() };
    await setGameState(user.id, GAME, state);
    return NextResponse.json({ started: true, balance: await addMoney(user.id, 0) });
  }

  if (action === "cashout") {
    const state = await getGameState<CrashState>(user.id, GAME);
    if (!state) return jsonError("No active round");
    const elapsed = Date.now() - state.startTime;
    const mult = multiplierAt(elapsed);
    await clearGameState(user.id, GAME);

    if (mult >= state.crashPoint) {
      await recordGame(user.id, "\u{1F680} Crash", false, state.bet, 0);
      return NextResponse.json({
        crashed: true,
        crashPoint: state.crashPoint,
        balance: await addMoney(user.id, 0),
      });
    }

    const payout = Math.floor(state.bet * mult);
    await addMoney(user.id, payout);
    await recordGame(user.id, "\u{1F680} Crash", true, state.bet, payout);
    if (mult >= 10) await unlockAchievement(user.id, "crash_10x");
    return NextResponse.json({
      crashed: false,
      cashedOutAt: mult,
      payout,
      balance: await addMoney(user.id, 0),
    });
  }

  return jsonError("Unknown action");
}

export async function DELETE() {
  const result = await requireUser();
  if ("error" in result) return result.error;
  await clearGameState(result.user.id, GAME);
  return NextResponse.json({ ok: true });
}
