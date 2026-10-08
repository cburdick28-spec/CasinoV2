"use client";

import { useEffect, useRef } from "react";
import CoinScene3D from "@/components/three/CoinScene3D";
import { useActionHandler, useGameController } from "./useGameController";
import { useGameView, type GameBar, type Vec3 } from "./bridge";

/** Looking at the plinth the coin spins above; the coin sits in the upper-middle of the view. */
export const camera: { eye: Vec3; target: Vec3 } = { eye: [0, 1.9, 3.3], target: [0, 1.05, 0] };

const FLIP_DURATION = 1100; // same as the page and CoinScene3D
const SPINS = 4; // full rotations before settling, purely visual
const money = (n: number) => `$${n.toLocaleString()}`;

type Side = "heads" | "tails";
interface CoinState {
  bet: number;
  pot: number;
  streak: number;
}
interface View {
  rotation: number;
  flipping: boolean;
}
interface FlipResponse {
  result?: Side;
  win?: boolean;
  state?: CoinState | null;
  error?: string;
}

function barFor(side: Side, st: CoinState | null): GameBar {
  const choices = [
    {
      id: "side",
      label: "Call",
      items: [
        { id: "heads", label: "Heads", active: side === "heads" },
        { id: "tails", label: "Tails", active: side === "tails" },
      ],
    },
  ];
  if (st) {
    return {
      bet: true,
      betLocked: true,
      status: `Streak ${st.streak}  ·  Pot ${money(st.pot)}`,
      choices,
      buttons: [
        { id: "flip", label: "Flip Again", primary: true },
        { id: "cashout", label: `Cash Out ${money(st.pot)}` },
      ],
      hint: "Each correct call multiplies the pot by 1.95x",
    };
  }
  return { bet: true, choices, buttons: [{ id: "flip", label: "Flip", primary: true }], hint: "Call it right and keep the streak going (1.95x per win)" };
}

/* ------------------------------ DOM side: logic ------------------------------ */

export function Controller() {
  const g = useGameController("coinflip");
  const r = useRef({ side: "heads" as Side, state: null as CoinState | null, rotation: 0, timer: null as ReturnType<typeof setTimeout> | null, flipping: false });

  const publish = (flipping = false) => {
    const s = r.current;
    g.setView({ rotation: s.rotation, flipping } satisfies View);
    g.update(barFor(s.side, s.state));
  };

  useEffect(() => {
    const s = r.current;
    g.setBar(barFor(s.side, s.state));
    g.setView({ rotation: 0, flipping: false } satisfies View);
    let alive = true;
    // Pick up a streak that is still running on the server.
    void g.request<{ state?: CoinState | null }>("GET").then((res) => {
      if (alive && res.ok && res.data.state) {
        s.state = res.data.state;
        publish();
      }
    });
    return () => {
      alive = false;
      if (s.timer) {
        clearTimeout(s.timer);
        s.timer = null;
        if (s.flipping) g.refresh(); // stood up mid-flip: the server already settled it
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g]);

  const flip = async () => {
    const s = r.current;
    if (!g.user()) {
      g.message("info", "Log in to place a bet");
      return;
    }
    const bet = g.bet();
    if (!s.state && bet > g.balance()) {
      g.message("lose", "Not enough balance for that bet");
      return;
    }
    g.setBusy(true);
    g.clearMessage();
    const res = await g.request<FlipResponse>("POST", { action: "flip", side: s.side, bet: s.state ? undefined : bet });
    if (!res.ok || !res.data.result) {
      g.setBusy(false);
      g.message("lose", res.data.error || "Something went wrong");
      g.toast("lose", res.data.error || "Something went wrong");
      return;
    }
    const data = res.data;
    const stakeBefore = s.state?.bet ?? bet;

    // Land exactly on the right face: heads = 0deg mod 360, tails = 180deg mod 360.
    const targetMod = data.result === "tails" ? 180 : 0;
    const currentMod = ((s.rotation % 360) + 360) % 360;
    let delta = targetMod - currentMod;
    if (delta <= 0) delta += 360;
    s.rotation = s.rotation + SPINS * 360 + delta;
    s.flipping = true;
    g.setView({ rotation: s.rotation, flipping: true } satisfies View);

    s.timer = setTimeout(() => {
      s.timer = null;
      s.flipping = false;
      g.setBusy(false);
      if (data.win && data.state) {
        s.state = data.state;
        publish();
        const text = `${data.result}! Streak ${data.state.streak}, pot ${money(data.state.pot)}`;
        g.message("win", text);
        g.toast("win", `${data.result}! Streak ${data.state.streak} — pot ${money(data.state.pot)}`);
        if (data.state.streak >= 4) g.celebrate();
      } else {
        s.state = null;
        publish();
        g.message("lose", `${data.result}! Lost ${money(stakeBefore)}`);
        g.toast("lose", `${data.result}! Lost ${money(stakeBefore)}`);
      }
      g.refresh();
    }, FLIP_DURATION);
  };

  const cashout = async () => {
    const s = r.current;
    g.setBusy(true);
    const res = await g.request<{ payout?: number; error?: string }>("POST", { action: "cashout" });
    g.setBusy(false);
    if (!res.ok) {
      g.message("lose", res.data.error || "Something went wrong");
      g.toast("lose", res.data.error || "Something went wrong");
      return;
    }
    const payout = res.data.payout ?? 0;
    s.state = null;
    publish();
    g.message("win", `Cashed out ${money(payout)}`);
    g.toast("win", `Cashed out ${money(payout)}`);
    g.refresh();
  };

  useActionHandler((id) => {
    const s = r.current;
    if (s.flipping) return;
    if (id === "flip") void flip();
    else if (id === "cashout" && s.state) void cashout();
    else if (id === "side:heads" || id === "side:tails") {
      s.side = id === "side:heads" ? "heads" : "tails";
      g.update(barFor(s.side, s.state));
    }
  });

  return null;
}

/* ------------------------------ Canvas side: 3D ------------------------------ */

/** The existing coin scene, spinning above the station's plinth (the station's own coin is hidden while seated). */
export function Stage() {
  const v = useGameView<View>() ?? { rotation: 0, flipping: false };
  return (
    <group position={[0, 1.4, 0]} scale={0.42}>
      <CoinScene3D rotation={v.rotation} flipping={v.flipping} />
    </group>
  );
}
