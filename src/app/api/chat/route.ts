import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import { all, get, run } from "@/lib/db";

export async function GET() {
  const rows = (await all("SELECT * FROM chat_messages ORDER BY id DESC LIMIT 50")).reverse();
  return NextResponse.json({ messages: rows });
}

export async function POST(req: NextRequest) {
  const result = await requireUser();
  if ("error" in result) return result.error;
  const body = await req.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 300) : "";
  if (!message) return NextResponse.json({ error: "Empty message" }, { status: 400 });

  await run("INSERT INTO chat_messages (user_id, username, message, created_at) VALUES (?, ?, ?, ?)", [result.user.id, result.user.username, message, Date.now()]);

  const count = await get<{ c: number }>("SELECT COUNT(*) as c FROM chat_messages");
  if (count && count.c > 500) {
    await run("DELETE FROM chat_messages WHERE id IN (SELECT id FROM chat_messages ORDER BY id ASC LIMIT ?)", [count.c - 500]);
  }

  return NextResponse.json({ ok: true });
}
