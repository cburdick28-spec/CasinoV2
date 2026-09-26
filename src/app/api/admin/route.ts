import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isDevAccount, setMoney } from "@/lib/account";
import { setJackpot } from "@/lib/db";
import { jsonError } from "@/lib/api";
import db from "@/lib/db";
import type { UserRow } from "@/lib/types";

async function requireDev() {
  const user = await getCurrentUser();
  if (!user || !isDevAccount(user)) return null;
  return user;
}

export async function GET() {
  const dev = await requireDev();
  if (!dev) return jsonError("Forbidden", 403);
  const users = db
    .prepare("SELECT id, username, money, is_dev, timeout_until FROM users ORDER BY username")
    .all();
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const dev = await requireDev();
  if (!dev) return jsonError("Forbidden", 403);
  const body = await req.json().catch(() => null);
  const action = body?.action;

  if (action === "give_money") {
    const target = db.prepare("SELECT * FROM users WHERE username = ?").get(body.username) as
      | UserRow
      | undefined;
    if (!target) return jsonError("User not found");
    setMoney(target.id, target.money + Number(body.amount || 0));
    return NextResponse.json({ ok: true });
  }

  if (action === "reset_all_money") {
    db.prepare("UPDATE users SET money = 500").run();
    return NextResponse.json({ ok: true });
  }

  if (action === "timeout_user") {
    const target = db.prepare("SELECT * FROM users WHERE username = ?").get(body.username) as
      | UserRow
      | undefined;
    if (!target) return jsonError("User not found");
    const minutes = Number(body.minutes || 5);
    db.prepare("UPDATE users SET timeout_until = ? WHERE id = ?").run(
      Date.now() + minutes * 60000,
      target.id
    );
    return NextResponse.json({ ok: true });
  }

  if (action === "remove_timeout") {
    const target = db.prepare("SELECT * FROM users WHERE username = ?").get(body.username) as
      | UserRow
      | undefined;
    if (!target) return jsonError("User not found");
    db.prepare("UPDATE users SET timeout_until = 0 WHERE id = ?").run(target.id);
    return NextResponse.json({ ok: true });
  }

  if (action === "set_jackpot") {
    setJackpot(Number(body.amount || 1000));
    return NextResponse.json({ ok: true });
  }

  return jsonError("Unknown action");
}
