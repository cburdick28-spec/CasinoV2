import { NextResponse } from "next/server";
import { all } from "@/lib/db";
import { getVipTier } from "@/lib/vip";
import { isDevAccount } from "@/lib/account";
import type { UserRow } from "@/lib/types";

export async function GET() {
  const rows = await all<UserRow>("SELECT * FROM users ORDER BY money DESC LIMIT 50");

  const board = rows
    .filter((u) => !isDevAccount(u))
    .slice(0, 20)
    .map((u) => {
      const tier = getVipTier(u.money);
      return {
        username: u.username,
        money: u.money,
        vip: { name: tier.name, emoji: tier.emoji, color: tier.color },
        gamesWon: u.games_won,
        gamesPlayed: u.games_played,
      };
    });

  return NextResponse.json({ leaderboard: board });
}
