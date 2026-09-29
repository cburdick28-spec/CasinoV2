import { NextRequest, NextResponse } from "next/server";
import { clampBet, jsonError, requireUser } from "@/lib/api";
import { addMoney, recordGame } from "@/lib/account";
import { MAX_BET } from "@/lib/vip";
import { isValidTarget, rollResult } from "@/lib/games/limbo";

export async function POST(req: NextRequest) {
  const result = await requireUser();
  if ("error" in result) return result.error;
  const { user, money } = result;
  const body = await req.json().catch(() => null);

  const bet = clampBet(body?.bet, money, MAX_BET);
  if (bet === null) return jsonError("Invalid bet amount");

  const target = Number(body?.target);
  if (!isValidTarget(target)) return jsonError("Invalid target multiplier");

  await addMoney(user.id, -bet);

  const roll = rollResult();
  const won = roll >= target;
  const payout = won ? Math.floor(bet * target) : 0;

  if (won) await addMoney(user.id, payout);
  await recordGame(user.id, "\u{1F4C9} Limbo", won, bet, payout);

  return NextResponse.json({ roll, target, won, payout, balance: await addMoney(user.id, 0) });
}
