import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { toPublicUser, currentJackpot } from "@/lib/account";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null, jackpot: await currentJackpot() });
  return NextResponse.json({ user: await toPublicUser(user), jackpot: await currentJackpot() });
}
