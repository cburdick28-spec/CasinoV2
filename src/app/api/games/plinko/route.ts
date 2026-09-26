import { NextRequest, NextResponse } from "next/server";
import { clampBet, jsonError, requireUser } from "@/lib/api";
import { addMoney, deductBet, isDevAccount, recordGame, unlockAchievement } from "@/lib/account";
import { randInt } from "@/lib/rng";
import { MAX_BET } from "@/lib/vip";

const ROWS = 12;

export const MULTIPLIERS: Record<"low" | "medium" | "high", number[]> = {
  low: [8, 3, 1.5, 1.2, 1, 0.5, 0.3, 0.5, 1, 1.2, 1.5, 3, 8],
  medium: [24, 8, 3, 1.5, 0.7, 0.4, 0.2, 0.4, 0.7, 1.5, 3, 8, 24],
  high: [76, 15, 6, 2, 0.5, 0.2, 0.1, 0.2, 0.5, 2, 6, 15, 76],
};

export async function POST(req: NextRequest) {
  const result = await requireUser();
  if ("error" in result) return result.error;
  const { user, money } = result;
  const body = await req.json().catch(() => null);
  const bet = clampBet(body?.bet, money, MAX_BET);
  const risk = ["low", "medium", "high"].includes(body?.risk) ? body.risk : "medium";
  if (bet === null) return jsonError("Invalid bet amount");
  if (!(await deductBet(user.id, bet, isDevAccount(user)))) return jsonError("Not enough balance");

  const path: number[] = [];
  let bucket = 0;
  for (let i = 0; i < ROWS; i++) {
    const step = randInt(0, 1);
    path.push(step);
    bucket += step;
  }

  const table = MULTIPLIERS[risk as "low" | "medium" | "high"];
  const multiplier = table[bucket];
  const payout = Math.floor(bet * multiplier);
  const won = payout > bet;

  if (won) await addMoney(user.id, payout);
  await recordGame(user.id, "\u{1F3B3} Plinko", won, bet, payout);
  if (multiplier === Math.max(...table)) await unlockAchievement(user.id, "plinko_max");

  return NextResponse.json({
    path,
    bucket,
    multiplier,
    payout,
    risk,
    balance: await addMoney(user.id, 0),
  });
}
