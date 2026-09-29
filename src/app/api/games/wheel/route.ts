import { NextRequest, NextResponse } from "next/server";
import { clampBet, jsonError, requireUser } from "@/lib/api";
import { addMoney, recordGame } from "@/lib/account";
import { randInt } from "@/lib/rng";
import { MAX_BET } from "@/lib/vip";
import { WHEEL_ORDER, payoutFor } from "@/lib/games/wheel";

export async function POST(req: NextRequest) {
  const result = await requireUser();
  if ("error" in result) return result.error;
  const { user, money } = result;
  const body = await req.json().catch(() => null);

  const bet = clampBet(body?.bet, money, MAX_BET);
  if (bet === null) return jsonError("Invalid bet amount");

  await addMoney(user.id, -bet);

  const index = randInt(0, WHEEL_ORDER.length - 1);
  const mult = WHEEL_ORDER[index];
  const payout = payoutFor(bet, mult);
  const won = payout > 0;

  if (won) await addMoney(user.id, payout);
  await recordGame(user.id, "\u{1F3A1} Wheel", won, bet, payout);

  return NextResponse.json({ index, mult, payout, won, balance: await addMoney(user.id, 0) });
}
