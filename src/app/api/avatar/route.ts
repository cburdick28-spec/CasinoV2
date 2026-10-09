import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { get, run } from "@/lib/db";
import { parseAvatar, sanitizeAvatar } from "@/lib/avatar";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  const row = await get<{ avatar: string }>("SELECT avatar FROM users WHERE id = ?", [user.id]);
  return NextResponse.json({ avatar: parseAvatar(row?.avatar) });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const avatar = sanitizeAvatar(body?.avatar);
  await run("UPDATE users SET avatar = ? WHERE id = ?", [JSON.stringify(avatar), user.id]);
  return NextResponse.json({ avatar });
}
