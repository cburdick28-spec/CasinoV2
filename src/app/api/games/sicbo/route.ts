import { NextRequest, NextResponse } from "next/server";
import { clampBet, jsonError, requireUser } from "@/lib/api";
import { addMoney, recordGame } from "@/lib/account";
import { MAX_BET } from "@/lib/vip";
import { evaluate, rollDice, type SicBoBetType } from "@/lib/games/sicbo";

const VALID_TYPES: SicBoBetType[] = ["big", "small", "anyTriple", "specificTriple", "number"];

export async function POST(req: NextRequest) {
  const result = await requireUser();
  if ("error" in result) return result.error;
  const { user, money } = result;
  const body = await req.json().catch(() => null);

  const bet = clampBet(body?.bet, money, MAX_BET);
  if (bet === null) return jsonError("Invalid bet amount");

  const betType: SicBoBetType = body?.betType;
  if (!VALID_TYPES.includes(betType)) return jsonError("Invalid bet type");

  let number: number | undefined;
  if (betType === "number" || betType === "specificTriple") {
    number = Math.floor(Number(body?.number));
    if (!Number.isFinite(number) || number < 1 || number > 6) return jsonError("Pick a number between 1 and 6");
  }

  await addMoney(user.id, -bet);

  const dice = rollDice();
  const mult = evaluate({ type: betType, number }, dice);
  const payout = Math.floor(bet * mult);
  const won = payout > 0;

  if (won) await addMoney(user.id, payout);
  await recordGame(user.id, "\u{1F3B2} Sic Bo", won, bet, payout);

  return NextResponse.json({ dice, mult, payout, won, balance: await addMoney(user.id, 0) });
}
