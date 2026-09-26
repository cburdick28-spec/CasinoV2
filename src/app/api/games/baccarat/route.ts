import { NextRequest, NextResponse } from "next/server";
import { clampBet, jsonError, requireUser } from "@/lib/api";
import { addMoney, recordGame } from "@/lib/account";
import { baccaratHandTotal, buildDeck } from "@/lib/cards";
import { MAX_BET } from "@/lib/vip";
import type { Card } from "@/lib/types";

function bankerShouldDraw(bankerTotal: number, playerThird: number | null): boolean {
  if (playerThird === null) return bankerTotal <= 5;
  if (bankerTotal <= 2) return true;
  if (bankerTotal === 3) return playerThird !== 8;
  if (bankerTotal === 4) return playerThird >= 2 && playerThird <= 7;
  if (bankerTotal === 5) return playerThird >= 4 && playerThird <= 7;
  if (bankerTotal === 6) return playerThird === 6 || playerThird === 7;
  return false;
}

export async function POST(req: NextRequest) {
  const result = await requireUser();
  if ("error" in result) return result.error;
  const { user, money } = result;
  const body = await req.json().catch(() => null);
  const side = body?.side === "banker" || body?.side === "tie" ? body.side : "player";
  const bet = clampBet(body?.bet, money, MAX_BET);
  if (bet === null) return jsonError("Invalid bet amount");

  const deck: Card[] = buildDeck();
  const player: Card[] = [deck.pop()!, deck.pop()!];
  const banker: Card[] = [deck.pop()!, deck.pop()!];

  let playerTotal = baccaratHandTotal(player);
  let bankerTotal = baccaratHandTotal(banker);
  const natural = playerTotal >= 8 || bankerTotal >= 8;
  let playerThird: number | null = null;

  if (!natural) {
    if (playerTotal <= 5) {
      const card = deck.pop()!;
      player.push(card);
      playerThird = baccaratHandTotal([card]);
      playerTotal = baccaratHandTotal(player);
    }
    if (bankerShouldDraw(bankerTotal, playerThird)) {
      banker.push(deck.pop()!);
      bankerTotal = baccaratHandTotal(banker);
    }
  }

  let winner: "player" | "banker" | "tie";
  if (playerTotal > bankerTotal) winner = "player";
  else if (bankerTotal > playerTotal) winner = "banker";
  else winner = "tie";

  let payout = 0;
  if (winner === side) {
    if (side === "player") payout = bet * 2;
    else if (side === "banker") payout = Math.floor(bet * 1.95);
    else payout = bet * 9;
  } else if (winner === "tie" && side !== "tie") {
    // Standard rule: tie pushes player/banker bets.
    payout = bet;
  }

  const won = payout > bet;
  const push = payout === bet;
  await addMoney(user.id, payout - bet);
  await recordGame(user.id, "\u{1F0CF} Baccarat", won, bet, payout, push);

  return NextResponse.json({
    player,
    banker,
    playerTotal,
    bankerTotal,
    winner,
    payout,
    balance: await addMoney(user.id, 0),
  });
}
