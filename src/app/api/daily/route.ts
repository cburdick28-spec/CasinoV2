import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import { get, run } from "@/lib/db";
import { addMoney, toPublicUser, unlockAchievement } from "@/lib/account";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export async function POST() {
  const result = await requireUser();
  if ("error" in result) return result.error;
  const { user } = result;

  const today = todayStr();
  if (user.last_daily === today) {
    return NextResponse.json({ error: "Already claimed today" }, { status: 400 });
  }

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const streak = user.last_daily === yesterday ? user.daily_streak + 1 : 1;
  const bonus = 100 + Math.min(streak - 1, 10) * 25;

  await run("UPDATE users SET last_daily = ?, daily_streak = ? WHERE id = ?", [today,
    streak,
    user.id]);
  await addMoney(user.id, bonus);
  if (streak >= 7) await unlockAchievement(user.id, "daily_7");

  const fresh = await get<typeof user>("SELECT * FROM users WHERE id = ?", [user.id]);
  return NextResponse.json({ ok: true, bonus, streak, user: await toPublicUser(fresh ?? user) });
}
