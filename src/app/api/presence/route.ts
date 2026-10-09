import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { all, run } from "@/lib/db";
import { parseAvatar } from "@/lib/avatar";

const STALE_MS = 6000;
const MAX_PLAYERS = 40;

interface Row {
  user_id: number;
  username: string;
  avatar: string;
  x: number;
  z: number;
  yaw: number;
  seated: string;
}

/**
 * Online presence without websockets or a third-party realtime service: each client posts its own pose
 * a few times a second and gets back everyone else seen in the last few seconds. Plain Postgres (Neon),
 * so it works on Vercel's serverless functions.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  const b = await req.json().catch(() => null);
  const num = (v: unknown, lim: number) => (typeof v === "number" && Number.isFinite(v) ? Math.max(-lim, Math.min(lim, v)) : 0);
  const seated = typeof b?.seated === "string" ? b.seated.replace(/[^a-z-]/g, "").slice(0, 24) : "";
  const now = Date.now();

  await run(
    `INSERT INTO presence (user_id, x, z, yaw, seated, updated_at) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (user_id) DO UPDATE SET x = EXCLUDED.x, z = EXCLUDED.z, yaw = EXCLUDED.yaw, seated = EXCLUDED.seated, updated_at = EXCLUDED.updated_at`,
    [user.id, num(b?.x, 200), num(b?.z, 200), num(b?.yaw, 100), seated, now],
  );
  const rows = await all<Row>(
    `SELECT p.user_id, u.username, u.avatar, p.x, p.z, p.yaw, p.seated
     FROM presence p JOIN users u ON u.id = p.user_id
     WHERE p.updated_at > ? AND p.user_id <> ? ORDER BY p.updated_at DESC LIMIT ?`,
    [now - STALE_MS, user.id, MAX_PLAYERS],
  );
  return NextResponse.json({
    players: rows.map((r) => ({
      id: r.user_id,
      name: r.username,
      avatar: parseAvatar(r.avatar),
      x: r.x,
      z: r.z,
      yaw: r.yaw,
      seated: r.seated || null,
    })),
  });
}
