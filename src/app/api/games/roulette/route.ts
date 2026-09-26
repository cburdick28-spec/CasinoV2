import { NextRequest, NextResponse } from "next/server";
import { jsonError, requireUser } from "@/lib/api";
import { addMoney, deductBet, isDevAccount, recordGame } from "@/lib/account";
import { randInt } from "@/lib/rng";
import { MAX_BET } from "@/lib/vip";

const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

function colorOf(n: number): "red" | "black" | "green" {
  if (n === 0) return "green";
  return RED_NUMBERS.has(n) ? "red" : "black";
}

type BetType =
  | "straight"
  | "red"
  | "black"
  | "odd"
  | "even"
  | "low"
  | "high"
  | "dozen1"
  | "dozen2"
  | "dozen3"
  | "col1"
  | "col2"
  | "col3";

interface Bet {
  type: BetType;
  amount: number;
  number?: number;
}

const PAYOUTS: Record<BetType, number> = {
  straight: 35,
  red: 1,
  black: 1,
  odd: 1,
  even: 1,
  low: 1,
  high: 1,
  dozen1: 2,
  dozen2: 2,
  dozen3: 2,
  col1: 2,
  col2: 2,
  col3: 2,
};

function betWins(bet: Bet, spin: number): boolean {
  const color = colorOf(spin);
  switch (bet.type) {
    case "straight":
      return spin === bet.number;
    case "red":
      return color === "red";
    case "black":
      return color === "black";
    case "odd":
      return spin !== 0 && spin % 2 === 1;
    case "even":
      return spin !== 0 && spin % 2 === 0;
    case "low":
      return spin >= 1 && spin <= 18;
    case "high":
      return spin >= 19 && spin <= 36;
    case "dozen1":
      return spin >= 1 && spin <= 12;
    case "dozen2":
      return spin >= 13 && spin <= 24;
    case "dozen3":
      return spin >= 25 && spin <= 36;
    case "col1":
      return spin !== 0 && spin % 3 === 1;
    case "col2":
      return spin !== 0 && spin % 3 === 2;
    case "col3":
      return spin !== 0 && spin % 3 === 0;
    default:
      return false;
  }
}

export async function POST(req: NextRequest) {
  const result = await requireUser();
  if ("error" in result) return result.error;
  const { user } = result;

  const body = await req.json().catch(() => null);
  const bets: Bet[] = Array.isArray(body?.bets) ? body.bets : [];
  if (bets.length === 0 || bets.length > 20) return jsonError("Place at least one bet");

  let totalBet = 0;
  for (const b of bets) {
    if (!PAYOUTS[b.type as BetType]) return jsonError("Invalid bet type");
    const amt = Number(b.amount);
    if (!Number.isFinite(amt) || amt < 1) return jsonError("Invalid bet amount");
    if (b.type === "straight" && (b.number === undefined || b.number < 0 || b.number > 36)) {
      return jsonError("Invalid straight-up number");
    }
    totalBet += Math.floor(amt);
  }
  if (totalBet > MAX_BET) return jsonError("Bet exceeds balance");
  if (!(await deductBet(user.id, totalBet, isDevAccount(user)))) return jsonError("Bet exceeds balance");

  const spin = randInt(0, 36);
  let totalPayout = 0;
  const results = bets.map((b) => {
    const amount = Math.floor(b.amount);
    const win = betWins(b, spin);
    const payout = win ? amount + amount * PAYOUTS[b.type as BetType] : 0;
    totalPayout += payout;
    return { ...b, amount, win, payout };
  });

  const won = totalPayout > 0;
  if (totalPayout > 0) await addMoney(user.id, totalPayout);
  await recordGame(user.id, "\u{1F3A1} Roulette", won, totalBet, totalPayout);

  return NextResponse.json({
    spin,
    color: colorOf(spin),
    results,
    totalBet,
    totalPayout,
    net: totalPayout - totalBet,
    balance: await addMoney(user.id, 0),
  });
}
