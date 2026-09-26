import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import db from "@/lib/db";

export async function GET() {
  const rows = db
    .prepare("SELECT * FROM chat_messages ORDER BY id DESC LIMIT 50")
    .all()
    .reverse();
  return NextResponse.json({ messages: rows });
}

export async function POST(req: NextRequest) {
  const result = await requireUser();
  if ("error" in result) return result.error;
  const body = await req.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 300) : "";
  if (!message) return NextResponse.json({ error: "Empty message" }, { status: 400 });

  db.prepare(
    "INSERT INTO chat_messages (user_id, username, message, created_at) VALUES (?, ?, ?, ?)"
  ).run(result.user.id, result.user.username, message, Date.now());

  const count = db.prepare("SELECT COUNT(*) as c FROM chat_messages").get() as { c: number };
  if (count.c > 500) {
    db.prepare(
      "DELETE FROM chat_messages WHERE id IN (SELECT id FROM chat_messages ORDER BY id ASC LIMIT ?)"
    ).run(count.c - 500);
  }

  return NextResponse.json({ ok: true });
}
