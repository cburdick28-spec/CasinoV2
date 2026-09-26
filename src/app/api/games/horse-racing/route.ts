import { NextRequest, NextResponse } from "next/server";
import { clampBet, jsonError, requireUser } from "@/lib/api";
import { addMoney, recordGame } from "@/lib/account";
import { randInt } from "@/lib/rng";
import { MAX_BET } from "@/lib/vip";

export const HORSES = [
  { name: "Thunder Bolt", emoji: "\u{1F40E}", odds: 2.0, speedRange: [8, 14] as [number, number] },
  { name: "Lucky Star", emoji: "\u{1F984}", odds: 3.5, speedRange: [6, 15] as [number, number] },
  { name: "Dark Shadow", emoji: "\u{1F434}", odds: 5.0, speedRange: [5, 16] as [number, number] },
  { name: "Golden Arrow", emoji: "\u{1F3C5}", odds: 4.0, speedRange: [6, 14] as [number, number] },
  { name: "Silver Wind", emoji: "\u{1F4A8}", odds: 2.5, speedRange: [7, 13] as [number, number] },
  { name: "Iron Hooves", emoji: "⚡", odds: 6.0, speedRange: [4, 17] as [number, number] },
];

const TRACK_LENGTH = 30;

export async function GET() {
  return NextResponse.json({ horses: HORSES });
}

export async function POST(req: NextRequest) {
  const result = await requireUser();
  if ("error" in result) return result.error;
  const { user, money } = result;
  const body = await req.json().catch(() => null);
  const bet = clampBet(body?.bet, money, MAX_BET);
  const horseIdx = Number(body?.horse);
  if (bet === null) return jsonError("Invalid bet amount");
  if (!Number.isInteger(horseIdx) || horseIdx < 0 || horseIdx >= HORSES.length) {
    return jsonError("Invalid horse selection");
  }

  const positions = new Array(HORSES.length).fill(0);
  const finished = new Array(HORSES.length).fill(false);
  const finishOrder: number[] = [];
  const steps: number[][] = [];

  while (finishOrder.length < HORSES.length) {
    HORSES.forEach((horse, i) => {
      if (!finished[i]) {
        const move = randInt(horse.speedRange[0], horse.speedRange[1]) / 10;
        positions[i] = Math.min(positions[i] + move, TRACK_LENGTH);
        if (positions[i] >= TRACK_LENGTH) {
          finished[i] = true;
          finishOrder.push(i);
        }
      }
    });
    steps.push([...positions]);
    if (steps.length > 500) break;
  }

  const winnerIdx = finishOrder[0];
  const won = winnerIdx === horseIdx;
  const payout = won ? Math.floor(bet * HORSES[horseIdx].odds) : 0;

  addMoney(user.id, payout - bet);
  recordGame(user.id, "\u{1F407} Horse Racing", won, bet, payout);

  return NextResponse.json({
    steps: steps.filter((_, i) => i % 2 === 0),
    finishOrder,
    winnerIdx,
    won,
    payout,
    balance: addMoney(user.id, 0),
  });
}
