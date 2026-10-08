"use client";

import { Suspense, useEffect, useRef } from "react";
import { Text } from "@react-three/drei";
import CrashScene3D from "@/components/three/CrashScene3D";
import { FONT_URL } from "../stations/common";
import { useActionHandler, useGameController } from "./useGameController";
import { useGameView, type GameBar, type Vec3 } from "./bridge";

/** Standing back from the launch pad, looking up the flight path (the bar covers the bottom third). */
export const camera: { eye: Vec3; target: Vec3 } = { eye: [0, 1.3, 3.6], target: [0, 1.75, 0] };

interface View {
  active: boolean;
  multiplier: number;
  crashed: number | null;
  cashedOutAt: number | null;
}
const IDLE: View = { active: false, multiplier: 1, crashed: null, cashedOutAt: null };

const money = (n: number) => `$${n.toLocaleString()}`;

function barFor(active: boolean, mult: number, bet: number): GameBar {
  if (active) {
    return {
      bet: true,
      betLocked: true,
      status: `Rocket climbing ${mult.toFixed(2)}x  ·  worth ${money(Math.floor(bet * mult))}`,
      buttons: [{ id: "cashout", label: `Cash Out @ ${mult.toFixed(2)}x`, primary: true }],
      hint: "Cash out before it crashes",
    };
  }
  return { bet: true, buttons: [{ id: "bet", label: "Place Bet", primary: true }], hint: "Esc or W A S D to step away" };
}

interface Poll {
  state?: { bet: number; multiplier: number } | null;
  crashed?: boolean;
  crashPoint?: number;
  error?: string;
}

/* ------------------------------ DOM side: logic ------------------------------ */

export function Controller() {
  const g = useGameController("crash");
  // The live round. Mutated only from handlers / timers, never during render.
  const r = useRef({
    active: false,
    mult: 1,
    crashed: null as number | null,
    cashed: null as number | null,
    bet: 0,
    timer: null as ReturnType<typeof setInterval> | null,
    inflight: false,
    gen: 0,
  });

  const publish = () => {
    const s = r.current;
    g.setView({ active: s.active, multiplier: s.mult, crashed: s.crashed, cashedOutAt: s.cashed } satisfies View);
    g.update(barFor(s.active, s.mult, s.bet));
  };

  const stopPolling = () => {
    const s = r.current;
    if (s.timer) clearInterval(s.timer);
    s.timer = null;
    s.gen += 1; // drop any poll response still in flight
  };

  const settleCrash = (point: number) => {
    const s = r.current;
    stopPolling();
    s.active = false;
    s.crashed = point;
    publish();
    g.message("lose", `Crashed at ${point.toFixed(2)}x${s.bet ? `  -${money(s.bet)}` : ""}`);
    g.toast("lose", `Crashed at ${point.toFixed(2)}x`);
    g.refresh();
  };

  // Same 150 ms poll of the server's authoritative multiplier as the 2D page.
  const startPolling = () => {
    const s = r.current;
    if (s.timer) clearInterval(s.timer);
    s.timer = setInterval(async () => {
      if (s.inflight || !s.active) return;
      s.inflight = true;
      const gen = s.gen;
      const res = await g.request<Poll>("GET");
      s.inflight = false;
      if (gen !== s.gen || !s.active || !res.ok) return;
      if (res.data.crashed) {
        settleCrash(res.data.crashPoint ?? s.mult);
      } else if (res.data.state) {
        s.mult = res.data.state.multiplier;
        publish();
      }
    }, 150);
  };

  // Mount: show the idle bar, and pick up a round that is still running on the server.
  useEffect(() => {
    g.setBar(barFor(false, 1, 0));
    g.setView(IDLE);
    let alive = true;
    void g.request<Poll>("GET").then((res) => {
      if (!alive || !res.ok) return;
      const s = r.current;
      if (res.data.crashed) {
        settleCrash(res.data.crashPoint ?? 1);
      } else if (res.data.state) {
        s.active = true;
        s.bet = res.data.state.bet;
        s.mult = res.data.state.multiplier;
        publish();
        startPolling();
      }
    });
    return () => {
      alive = false;
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g]);

  const placeBet = async () => {
    const s = r.current;
    if (!g.user()) {
      g.message("info", "Log in to place a bet");
      return;
    }
    const bet = g.bet();
    if (bet > g.balance()) {
      g.message("lose", "Not enough balance for that bet");
      return;
    }
    g.setBusy(true);
    s.crashed = null;
    s.cashed = null;
    g.clearMessage();
    publish();
    const res = await g.request<{ started?: boolean; error?: string }>("POST", { action: "bet", bet });
    g.setBusy(false);
    if (!res.ok) {
      g.message("lose", res.data.error || "Something went wrong");
      g.toast("lose", res.data.error || "Something went wrong");
      return;
    }
    stopPolling();
    s.mult = 1;
    s.bet = bet;
    s.active = true;
    publish();
    g.refresh();
    startPolling();
  };

  const cashout = async () => {
    const s = r.current;
    stopPolling();
    g.setBusy(true);
    const res = await g.request<{ crashed?: boolean; crashPoint?: number; cashedOutAt?: number; payout?: number; error?: string }>("POST", { action: "cashout" });
    g.setBusy(false);
    s.active = false;
    if (!res.ok) {
      publish();
      g.message("lose", res.data.error || "Something went wrong");
      g.toast("lose", res.data.error || "Something went wrong");
      g.refresh();
      return;
    }
    if (res.data.crashed) {
      const point = res.data.crashPoint ?? s.mult;
      s.crashed = point;
      publish();
      g.message("lose", `Crashed at ${point.toFixed(2)}x, too slow!  -${money(s.bet)}`);
      g.toast("lose", `Crashed at ${point.toFixed(2)}x — too slow!`);
    } else {
      const at = res.data.cashedOutAt ?? s.mult;
      const net = (res.data.payout ?? 0) - s.bet;
      s.cashed = at;
      publish();
      g.message("win", `Cashed out at ${at.toFixed(2)}x  +${money(net)}`);
      g.toast("win", `Cashed out at ${at.toFixed(2)}x — +${money(net)}`);
      if (at >= 10) g.celebrate();
    }
    g.refresh();
  };

  useActionHandler((id) => {
    if (id === "bet" && !r.current.active) void placeBet();
    else if (id === "cashout" && r.current.active) void cashout();
  });

  return null;
}

/* ------------------------------ Canvas side: 3D ------------------------------ */

/** The existing rocket scene on the station's launch pad (its own pad is dropped; the station has one). */
export function Stage() {
  const v = useGameView<View>() ?? IDLE;
  const color = v.crashed !== null ? "#ff5470" : v.cashedOutAt !== null ? "#7dffa6" : v.active ? "#7dffa6" : "#cfd3ea";
  const shown = v.crashed !== null ? v.crashed : v.cashedOutAt !== null ? v.cashedOutAt : v.multiplier;
  return (
    <>
      <group position={[0, 0.84, 0.1]} scale={0.55}>
        <CrashScene3D pad={false} active={v.active} multiplier={v.multiplier} crashed={v.crashed} cashedOutAt={v.cashedOutAt} />
      </group>
      <Suspense fallback={null}>
        <Text
          font={FONT_URL}
          position={[1.0, 3.0, 0.2]}
          fontSize={0.5}
          anchorX="left"
          anchorY="middle"
          color={color}
          outlineWidth={0.02}
          outlineColor="#0b0c1c"
          material-toneMapped={false}
        >
          {`${shown.toFixed(2)}x`}
        </Text>
        {(v.crashed !== null || v.cashedOutAt !== null) && (
          <Text
            font={FONT_URL}
            position={[1.0, 2.55, 0.2]}
            fontSize={0.22}
            anchorX="left"
            anchorY="middle"
            color={color}
            outlineWidth={0.01}
            outlineColor="#0b0c1c"
            material-toneMapped={false}
          >
            {v.crashed !== null ? "CRASHED" : "CASHED OUT"}
          </Text>
        )}
      </Suspense>
    </>
  );
}
