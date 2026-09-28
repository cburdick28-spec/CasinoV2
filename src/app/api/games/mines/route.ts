import { NextRequest, NextResponse } from "next/server";
import { clampBet, jsonError, requireUser } from "@/lib/api";
import { addMoney, clearGameState, getGameState, recordGame, setGameState } from "@/lib/account";
import { MAX_BET } from "@/lib/vip";
import {
  GRID_SIZE,
  MAX_MINES,
  MIN_MINES,
  currentPayout,
  multiplierFor,
  newMines,
  type MinesState,
} from "@/lib/games/mines";

const GAME = "mines";

function publicState(state: MinesState) {
  return {
    bet: state.bet,
    minesCount: state.minesCount,
    revealed: state.revealed,
    multiplier: multiplierFor(state.minesCount, state.revealed.length),
    payout: currentPayout(state),
    nextMultiplier: multiplierFor(state.minesCount, state.revealed.length + 1),
  };
}

export async function GET() {
  const result = await requireUser();
  if ("error" in result) return result.error;
  const state = await getGameState<MinesState>(result.user.id, GAME);
  return NextResponse.json({ state: state ? publicState(state) : null });
}

export async function POST(req: NextRequest) {
  const result = await requireUser();
  if ("error" in result) return result.error;
  const { user, money } = result;
  const body = await req.json().catch(() => null);
  const action = body?.action;

  let state = await getGameState<MinesState>(user.id, GAME);

  if (action === "start") {
    if (state) return jsonError("A round is already in progress");
    const bet = clampBet(body?.bet, money, MAX_BET);
    if (bet === null) return jsonError("Invalid bet amount");
    const minesCount = Math.floor(Number(body?.mines));
    if (!Number.isFinite(minesCount) || minesCount < MIN_MINES || minesCount > MAX_MINES) {
      return jsonError(`Mines must be between ${MIN_MINES} and ${MAX_MINES}`);
    }
    await addMoney(user.id, -bet);
    state = { bet, minesCount, mines: newMines(minesCount), revealed: [] };
    await setGameState(user.id, GAME, state);
    return NextResponse.json({ state: publicState(state), balance: await addMoney(user.id, 0) });
  }

  if (!state) return jsonError("No active round — start one first");

  if (action === "reveal") {
    const tile = Math.floor(Number(body?.tile));
    if (!Number.isFinite(tile) || tile < 0 || tile >= GRID_SIZE) return jsonError("Invalid tile");
    if (state.revealed.includes(tile)) return jsonError("Tile already revealed");

    if (state.mines.includes(tile)) {
      await recordGame(user.id, "\u{1F4A3} Mines", false, state.bet, 0);
      await clearGameState(user.id, GAME);
      return NextResponse.json({
        hit: true,
        mines: state.mines,
        revealed: state.revealed,
        balance: await addMoney(user.id, 0),
      });
    }

    state.revealed = [...state.revealed, tile];

    if (state.revealed.length === GRID_SIZE - state.minesCount) {
      // Cleared the whole board — auto cash out at the max multiplier.
      const payout = currentPayout(state);
      await addMoney(user.id, payout);
      await recordGame(user.id, "\u{1F4A3} Mines", true, state.bet, payout);
      await clearGameState(user.id, GAME);
      return NextResponse.json({
        hit: false,
        cleared: true,
        payout,
        mines: state.mines,
        revealed: state.revealed,
        balance: await addMoney(user.id, 0),
      });
    }

    await setGameState(user.id, GAME, state);
    return NextResponse.json({ hit: false, state: publicState(state), balance: await addMoney(user.id, 0) });
  }

  if (action === "cashout") {
    if (state.revealed.length === 0) return jsonError("Reveal at least one tile before cashing out");
    const payout = currentPayout(state);
    await addMoney(user.id, payout);
    await recordGame(user.id, "\u{1F4A3} Mines", true, state.bet, payout);
    await clearGameState(user.id, GAME);
    return NextResponse.json({ cashedOut: true, payout, mines: state.mines, balance: await addMoney(user.id, 0) });
  }

  return jsonError("Unknown action");
}

export async function DELETE() {
  const result = await requireUser();
  if ("error" in result) return result.error;
  await clearGameState(result.user.id, GAME);
  return NextResponse.json({ ok: true });
}
