import { NextRequest, NextResponse } from "next/server";
import { clampBet, jsonError, requireUser } from "@/lib/api";
import { addMoney, recordGame } from "@/lib/account";
import { MAX_BET } from "@/lib/vip";
import { KENO_MAX_NUMBER, KENO_MAX_PICKS, drawNumbers, multiplierFor } from "@/lib/games/keno";

export async function POST(req: NextRequest) {
  const result = await requireUser();
  if ("error" in result) return result.error;
  const { user, money } = result;
  const body = await req.json().catch(() => null);

  const bet = clampBet(body?.bet, money, MAX_BET);
  if (bet === null) return jsonError("Invalid bet amount");

  const picksRaw: unknown[] = Array.isArray(body?.picks) ? body.picks : [];
  const picksNums: number[] = picksRaw.map((n: unknown): number => Math.floor(Number(n)));
  const picks: number[] = Array.from(new Set(picksNums));
  if (picks.length < 1 || picks.length > KENO_MAX_PICKS) {
    return jsonError(`Pick between 1 and ${KENO_MAX_PICKS} numbers`);
  }
  if (picks.some((n: number) => !Number.isFinite(n) || n < 1 || n > KENO_MAX_NUMBER)) {
    return jsonError(`Numbers must be between 1 and ${KENO_MAX_NUMBER}`);
  }

  await addMoney(user.id, -bet);

  const drawn = drawNumbers();
  const drawnSet = new Set(drawn);
  const hits = picks.filter((n: number) => drawnSet.has(n)).length;
  const mult = multiplierFor(picks.length, hits);
  const payout = Math.floor(bet * mult);
  const won = payout > 0;

  if (won) await addMoney(user.id, payout);
  await recordGame(user.id, "\u{1F3B1} Keno", won, bet, payout);

  return NextResponse.json({ drawn, hits, mult, payout, won, balance: await addMoney(user.id, 0) });
}
