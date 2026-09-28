import { NextRequest, NextResponse } from "next/server";
import { clampBet, jsonError, requireUser } from "@/lib/api";
import { addMoney, currentJackpot, deductBet, isDevAccount, recordGame, unlockAchievement } from "@/lib/account";
import { addToJackpot, setJackpot } from "@/lib/db";
import { randInt } from "@/lib/rng";
import { MAX_BET } from "@/lib/vip";

interface SlotSymbol {
  id: string;
  weight: number;
  triplePay: number;
  twoPay: number;
  isJackpot?: boolean;
}

export const SYMBOLS: SlotSymbol[] = [
  { id: "\u{1F352}", weight: 30, triplePay: 3, twoPay: 1.5 }, // cherries
  { id: "\u{1F34B}", weight: 25, triplePay: 4, twoPay: 2 }, // lemon
  { id: "\u{1F349}", weight: 20, triplePay: 6, twoPay: 2.5 }, // watermelon
  { id: "⭐", weight: 12, triplePay: 10, twoPay: 4 }, // star
  { id: "\u{1F48E}", weight: 8, triplePay: 25, twoPay: 8 }, // diamond
  { id: "7️⃣", weight: 4, triplePay: 50, twoPay: 15, isJackpot: true },
];

function weightedSymbol(): SlotSymbol {
  const total = SYMBOLS.reduce((s, sym) => s + sym.weight, 0);
  let r = randInt(1, total);
  for (const sym of SYMBOLS) {
    if (r <= sym.weight) return sym;
    r -= sym.weight;
  }
  return SYMBOLS[0];
}

export async function POST(req: NextRequest) {
  const result = await requireUser();
  if ("error" in result) return result.error;
  const { user, money } = result;

  const body = await req.json().catch(() => null);
  const bet = clampBet(body?.bet, money, MAX_BET);
  if (bet === null) return jsonError("Invalid bet amount");
  if (!(await deductBet(user.id, bet, isDevAccount(user)))) return jsonError("Not enough balance");

  const reels = [weightedSymbol(), weightedSymbol(), weightedSymbol()];
  const jackpotBefore = await currentJackpot();
  let payout = 0;
  let won = false;
  let jackpotWon = 0;

  if (reels[0].id === reels[1].id && reels[1].id === reels[2].id) {
    payout = bet * reels[0].triplePay;
    won = true;
    if (reels[0].isJackpot) {
      jackpotWon = jackpotBefore;
      payout += jackpotWon;
      await setJackpot(1000);
      await unlockAchievement(user.id, "jackpot");
    }
  } else if (reels[0].id === reels[1].id || reels[1].id === reels[2].id) {
    const matched = reels[0].id === reels[1].id ? reels[0] : reels[1];
    payout = Math.floor(bet * matched.twoPay);
    won = true;
  } else {
    await addToJackpot(Math.ceil(bet * 0.2));
  }

  if (won) await addMoney(user.id, payout);
  await recordGame(user.id, "\u{1F3B0} Slots", won, bet, payout);

  return NextResponse.json({
    reels: reels.map((s) => s.id),
    won,
    payout,
    jackpotWon,
    jackpot: await currentJackpot(),
    balance: await addMoney(user.id, 0),
  });
}
