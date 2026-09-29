import { NextRequest, NextResponse } from "next/server";
import { clampBet, jsonError, requireUser } from "@/lib/api";
import { addMoney, clearGameState, getGameState, recordGame, setGameState } from "@/lib/account";
import { MAX_BET } from "@/lib/vip";
import { compare, drawTwo } from "@/lib/games/war";
import type { Card } from "@/lib/types";

const GAME = "war";

interface WarState {
  bet: number;
  playerCard: Card;
  dealerCard: Card;
}

export async function GET() {
  const result = await requireUser();
  if ("error" in result) return result.error;
  const state = await getGameState<WarState>(result.user.id, GAME);
  return NextResponse.json({ state });
}

export async function POST(req: NextRequest) {
  const result = await requireUser();
  if ("error" in result) return result.error;
  const { user, money } = result;
  const body = await req.json().catch(() => null);
  const action = body?.action;

  const pending = await getGameState<WarState>(user.id, GAME);

  if (action === "draw") {
    if (pending) return jsonError("Resolve the current war round first");
    const bet = clampBet(body?.bet, money, MAX_BET);
    if (bet === null) return jsonError("Invalid bet amount");

    await addMoney(user.id, -bet);
    const { player, dealer } = drawTwo();
    const outcome = compare(player, dealer);

    if (outcome === "tie") {
      await setGameState(user.id, GAME, { bet, playerCard: player, dealerCard: dealer });
      return NextResponse.json({
        result: "tie",
        playerCard: player,
        dealerCard: dealer,
        balance: await addMoney(user.id, 0),
      });
    }

    const won = outcome === "win";
    const payout = won ? bet * 2 : 0;
    if (won) await addMoney(user.id, payout);
    await recordGame(user.id, "\u{2694}\u{FE0F} Casino War", won, bet, payout);

    return NextResponse.json({
      result: outcome,
      playerCard: player,
      dealerCard: dealer,
      payout,
      balance: await addMoney(user.id, 0),
    });
  }

  if (!pending) return jsonError("No pending war round");

  if (action === "surrender") {
    const refund = Math.floor(pending.bet / 2);
    await addMoney(user.id, refund);
    await recordGame(user.id, "\u{2694}\u{FE0F} Casino War", false, pending.bet, refund);
    await clearGameState(user.id, GAME);
    return NextResponse.json({ result: "surrendered", payout: refund, balance: await addMoney(user.id, 0) });
  }

  if (action === "war") {
    const raise = clampBet(pending.bet, money, MAX_BET);
    if (raise === null) return jsonError("Not enough money to go to war");
    await addMoney(user.id, -raise);

    const { player, dealer } = drawTwo();
    const outcome = compare(player, dealer);
    // A second tie is a house rule win for the player, so the war always resolves.
    const won = outcome === "win" || outcome === "tie";
    const totalStaked = pending.bet + raise;
    const payout = won ? totalStaked * 2 : 0;
    if (won) await addMoney(user.id, payout);
    await recordGame(user.id, "\u{2694}\u{FE0F} Casino War", won, totalStaked, payout);
    await clearGameState(user.id, GAME);

    return NextResponse.json({
      result: won ? "win" : "lose",
      playerCard: player,
      dealerCard: dealer,
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
