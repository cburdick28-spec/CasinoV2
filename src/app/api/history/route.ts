import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import db from "@/lib/db";
import type { BetHistoryRow } from "@/lib/types";

export async function GET() {
  const result = await requireUser();
  if ("error" in result) return result.error;
  const rows = db
    .prepare(
      "SELECT * FROM bet_history WHERE user_id = ? ORDER BY id DESC LIMIT 100"
    )
    .all(result.user.id) as BetHistoryRow[];
  return NextResponse.json({ history: rows });
}
