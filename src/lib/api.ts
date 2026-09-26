import { NextResponse } from "next/server";
import { getCurrentUser } from "./auth";
import { effectiveMoney } from "./account";
import type { UserRow } from "./types";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function requireUser(): Promise<
  { user: UserRow; money: number } | { error: NextResponse }
> {
  const user = await getCurrentUser();
  if (!user) return { error: jsonError("Not logged in", 401) };
  if (user.timeout_until > Date.now()) {
    const remaining = Math.ceil((user.timeout_until - Date.now()) / 1000);
    return { error: jsonError(`You are timed out for ${remaining}s`, 403) };
  }
  return { user, money: effectiveMoney(user) };
}

export function clampBet(bet: unknown, money: number, maxBet: number): number | null {
  const n = Number(bet);
  if (!Number.isFinite(n) || n < 1) return null;
  const floored = Math.floor(n);
  if (floored > money || floored > maxBet) return null;
  return floored;
}
