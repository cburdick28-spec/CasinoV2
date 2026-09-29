import { NextRequest, NextResponse } from "next/server";
import { clampBet, jsonError, requireUser } from "@/lib/api";
import { addMoney, clearGameState, getGameState, recordGame, setGameState } from "@/lib/account";
import { buildDeck } from "@/lib/cards";
import { handName } from "@/lib/poker";
import { evaluateFinalHand } from "@/lib/games/videopoker";
import { MAX_BET } from "@/lib/vip";
import type { Card } from "@/lib/types";

const GAME = "videopoker";

interface VPState {
  bet: number;
  hand: Card[];
  deck: Card[];
}

export async function GET() {
  const result = await requireUser();
  if ("error" in result) return result.error;
  const state = await getGameState<VPState>(result.user.id, GAME);
  return NextResponse.json({ state: state ? { bet: state.bet, hand: state.hand } : null });
}

export async function POST(req: NextRequest) {
  const result = await requireUser();
  if ("error" in result) return result.error;
  const { user, money } = result;
  const body = await req.json().catch(() => null);
  const action = body?.action;

  const pending = await getGameState<VPState>(user.id, GAME);

  if (action === "deal") {
    if (pending) return jsonError("Finish the current hand first (draw or it will be replaced)");
    const bet = clampBet(body?.bet, money, MAX_BET);
    if (bet === null) return jsonError("Invalid bet amount");

    await addMoney(user.id, -bet);
    const deck = buildDeck();
    const hand = deck.slice(0, 5);
    const rest = deck.slice(5);
    await setGameState(user.id, GAME, { bet, hand, deck: rest });

    return NextResponse.json({ hand, balance: await addMoney(user.id, 0) });
  }

  if (action === "draw") {
    if (!pending) return jsonError("Deal a hand first");
    const holdsRaw = Array.isArray(body?.holds) ? body.holds : [];
    const holds: boolean[] = [0, 1, 2, 3, 4].map((i) => Boolean(holdsRaw[i]));

    const deck = [...pending.deck];
    const finalHand = pending.hand.map((c, i) => (holds[i] ? c : deck.shift()!));

    const { score, mult } = evaluateFinalHand(finalHand);
    const payout = Math.floor(pending.bet * mult);
    const won = payout > 0;

    if (won) await addMoney(user.id, payout);
    await recordGame(user.id, "\u{1F0CF} Video Poker", won, pending.bet, payout);
    await clearGameState(user.id, GAME);

    return NextResponse.json({
      hand: finalHand,
      handName: handName(score),
      mult,
      payout,
      won,
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
