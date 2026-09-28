import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import { all } from "@/lib/db";
import type { BetHistoryRow } from "@/lib/types";

export async function GET() {
  const result = await requireUser();
  if ("error" in result) return result.error;
  const rows = await all<BetHistoryRow>("SELECT * FROM bet_history WHERE user_id = ? ORDER BY id DESC LIMIT 100", [result.user.id]);
  return NextResponse.json({ history: rows });
}
