import { NextRequest, NextResponse } from "next/server";
import { createSession, getUserByUsername, verifyPassword } from "@/lib/auth";
import { jsonError } from "@/lib/api";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  const user = await getUserByUsername(username);
  if (!user || !verifyPassword(password, user.salt, user.password_hash)) {
    return jsonError("Invalid username or password", 401);
  }

  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
