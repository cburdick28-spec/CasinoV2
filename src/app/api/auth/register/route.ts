import { NextRequest, NextResponse } from "next/server";
import { get } from "@/lib/db";
import { createSession, getUserByUsername, hashPassword } from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { STARTING_MONEY } from "@/lib/vip";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!username || username.length < 3 || username.length > 20) {
    return jsonError("Username must be 3-20 characters");
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return jsonError("Username can only contain letters, numbers and underscores");
  }
  if (!password || password.length < 4) {
    return jsonError("Password must be at least 4 characters");
  }
  if (await getUserByUsername(username)) {
    return jsonError("That username is already taken");
  }

  const { hash, salt } = hashPassword(password);
  const info = await get<{ id: number }>("INSERT INTO users (username, password_hash, salt, money, created_at) VALUES (?, ?, ?, ?, ?) RETURNING id", [username, hash, salt, STARTING_MONEY, Date.now()]);

  await createSession(info!.id);
  return NextResponse.json({ ok: true });
}
