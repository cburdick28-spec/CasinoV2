"use client";

import { useEffect, useRef } from "react";
import WheelScene3D from "@/components/three/WheelScene3D";
import { WHEEL_ORDER } from "@/lib/games/wheel";
import { useActionHandler, useGameController } from "./useGameController";
import { useGameView, type Vec3 } from "./bridge";

/** Standing back from the big vertical wheel (centre y 1.38 on its frame), aimed low so the wheel sits above the control bar. */
export const camera: { eye: Vec3; target: Vec3 } = { eye: [0, 1.4, 4.3], target: [0, 0.45, 0] };

interface SpinResponse {
  index: number;
  mult: number;
  payout: number;
  won: boolean;
  error?: string;
}
interface View {
  index: number | null;
  spinning: boolean;
}

const money = (n: number) => `$${n.toLocaleString()}`;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const HINT = "0x bust (dark) · 0.5x blue · 1x green · 1.5-2x gold · 3x and 5x red";

export function Controller() {
  const g = useGameController("wheel");
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    g.setBar({ bet: true, status: "One spin, one multiplier: from a total bust up to 5x", buttons: [{ id: "spin", label: "Spin", primary: true }], hint: HINT });
    g.setView({ index: null, spinning: false } satisfies View);
    return () => {
      alive.current = false;
    };
  }, [g]);

  useActionHandler(async (id) => {
    if (id !== "spin") return;
    if (!g.user()) {
      g.message("info", "Log in to place a bet");
      return;
    }
    const bet = Math.floor(g.bet());
    if (bet < 1 || bet > g.balance()) {
      g.message("lose", "Not enough balance for that bet");
      return;
    }
    g.setBusy(true);
    g.clearMessage();
    g.setView({ index: null, spinning: true } satisfies View);
    const res = await g.request<SpinResponse>("POST", { bet });
    if (!res.ok || typeof res.data.index !== "number") {
      const err = res.data.error || "Something went wrong";
      g.toast("lose", err);
      if (!alive.current) return;
      g.setView({ index: null, spinning: false } satisfies View);
      g.setBusy(false);
      g.message("lose", err);
      return;
    }
    const d = res.data;
    // The wheel tweens to the true slice; the result waits for it to stop (the 2D page waits 3.1s).
    if (alive.current) g.setView({ index: d.index, spinning: true } satisfies View);
    await sleep(3100);
    const net = d.payout - bet;
    g.toast(net >= 0 ? "win" : "lose", `${d.mult}x — ${net >= 0 ? "+" : ""}${money(net)}`);
    if (d.mult >= 3) g.celebrate();
    g.refresh();
    if (!alive.current) return;
    g.setView({ index: d.index, spinning: false } satisfies View);
    g.setBusy(false);
    g.message(d.mult === 0 || net < 0 ? "lose" : "win", d.mult === 0 ? `Busted — -${money(bet)}` : net >= 0 ? `${d.mult}x — +${money(net)}` : `${d.mult}x — -${money(Math.abs(net))}`);
    g.update({ bet: true, status: `Landed on ${d.mult}x`, buttons: [{ id: "spin", label: "Spin", primary: true }], hint: HINT });
  });

  return null;
}

/* ------------------------------ Canvas side: 3D ------------------------------ */

/** The existing prize wheel, standing in the station's frame where the decorative wheel face normally turns. */
export function Stage() {
  const view = useGameView<View>();
  return (
    <group position={[0, 1.38, 0.12]} scale={0.7}>
      <WheelScene3D segments={WHEEL_ORDER} winningIndex={view?.index ?? null} spinning={view?.spinning ?? false} />
    </group>
  );
}
