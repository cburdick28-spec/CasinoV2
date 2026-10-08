"use client";

import { useEffect, useRef } from "react";
import { DiceTray3D } from "@/components/three/Dice3D";
import { useActionHandler, useGameController } from "./useGameController";
import { useGameSession, useGameView, type GameBar, type Vec3 } from "./bridge";

/** Seated at the player rail of the craps table, looking down the layout where the dice land. */
export const camera: { eye: Vec3; target: Vec3 } = { eye: [0, 1.95, 1.2], target: [0, 0.25, -0.15] };

interface CrapsState {
  phase: "come_out" | "point";
  point: number | null;
  bet: number;
  oddsBet: number;
}
interface RollResponse {
  dice: [number, number];
  total: number;
  outcome: "win" | "lose" | "continue";
  message: string;
  payout: number;
  state: CrapsState | null;
  error?: string;
}
interface View {
  dice: [number, number];
  rolling: boolean;
}

const money = (n: number) => `$${n.toLocaleString()}`;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function barFor(st: CrapsState | null, bet: number): GameBar {
  if (!st) {
    return {
      bet: true,
      betLocked: false,
      status: "Come out roll: 7 or 11 wins, 2, 3 or 12 loses, anything else sets your point",
      buttons: [{ id: "roll", label: "Come Out Roll", primary: true }],
      hint: "Esc or W A S D to step away",
    };
  }
  return {
    bet: true,
    betLocked: false,
    status: `Point: ${st.point} · Bet ${money(st.bet)}${st.oddsBet > 0 ? ` + ${money(st.oddsBet)} odds` : ""}`,
    buttons: [
      { id: "roll", label: "Roll", primary: true },
      { id: "odds", label: `Add Odds ${money(bet)}` },
    ],
    hint: "Point wins, 7 loses · Up/Down = odds amount",
  };
}

export function Controller() {
  const g = useGameController("craps");
  const st = useRef<CrapsState | null>(null);
  const dice = useRef<[number, number]>([3, 4]);
  const alive = useRef(true);
  const bet = useGameSession((s) => s.bet);

  // The odds button shows the stepper's amount, so re-publish it when the stepper moves.
  useEffect(() => {
    if (st.current) g.update(barFor(st.current, bet));
  }, [g, bet]);

  // Pick up a point that is still running on the server.
  useEffect(() => {
    alive.current = true;
    g.setBar(barFor(null, g.bet()));
    g.setView({ dice: dice.current, rolling: false } satisfies View);
    void g.request<{ state?: CrapsState | null }>("GET").then((res) => {
      if (alive.current && res.ok && res.data.state) {
        st.current = res.data.state;
        g.update(barFor(st.current, g.bet()));
      }
    });
    return () => {
      alive.current = false;
    };
  }, [g]);

  async function roll() {
    const first = !st.current;
    if (!g.user()) {
      g.message("info", "Log in to place a bet");
      return;
    }
    if (first && g.bet() > g.balance()) {
      g.message("lose", "Not enough balance for that bet");
      return;
    }
    g.setBusy(true);
    g.clearMessage();
    g.setView({ dice: dice.current, rolling: true } satisfies View);
    const res = await g.request<RollResponse>("POST", { action: "roll", bet: first ? g.bet() : undefined });
    if (!res.ok || !res.data.dice) {
      const err = res.data.error || "Something went wrong";
      g.toast("lose", err);
      if (!alive.current) return;
      g.setView({ dice: dice.current, rolling: false } satisfies View);
      g.setBusy(false);
      g.message("lose", err);
      return;
    }
    const d = res.data;
    dice.current = d.dice;
    // Tumble with the true dice already loaded, then let them settle before the result is read out.
    if (alive.current) g.setView({ dice: d.dice, rolling: true } satisfies View);
    await sleep(1500);
    if (alive.current) g.setView({ dice: d.dice, rolling: false } satisfies View);
    await sleep(500);
    if (d.outcome !== "continue") g.toast(d.outcome === "win" ? "win" : "lose", d.message);
    g.refresh();
    if (!alive.current) return;
    st.current = d.state;
    g.setBusy(false);
    g.update(barFor(st.current, g.bet()));
    g.message(d.outcome === "win" ? "win" : d.outcome === "lose" ? "lose" : "info", `${d.dice[0]} + ${d.dice[1]} = ${d.total}.  ${d.message}`);
    if (d.outcome === "win") g.celebrate();
  }

  async function addOdds() {
    if (!g.user()) {
      g.message("info", "Log in to place a bet");
      return;
    }
    const amount = Math.floor(g.bet());
    if (amount < 1 || amount > g.balance()) {
      g.message("lose", "Not enough balance for that odds bet");
      return;
    }
    g.setBusy(true);
    const res = await g.request<{ state?: CrapsState; error?: string }>("POST", { action: "add_odds", amount });
    if (!alive.current) return;
    g.setBusy(false);
    if (!res.ok || !res.data.state) {
      const err = res.data.error || "Something went wrong";
      g.message("lose", err);
      g.toast("lose", err);
      return;
    }
    st.current = res.data.state;
    g.update(barFor(st.current, g.bet()));
    g.message("info", `Odds bet added: ${money(amount)}`);
    g.refresh();
  }

  useActionHandler((id) => {
    if (id === "roll") void roll();
    else if (id === "odds") void addOdds();
  });

  return null;
}

/* ------------------------------ Canvas side: 3D ------------------------------ */

/** The existing tumbling-dice tray without its felt disc, shrunk so the dice are table-sized, on the layout in front of the stickman. */
export function Stage() {
  const view = useGameView<View>();
  return (
    <group position={[0, 0.875, 0.05]} scale={0.24}>
      <DiceTray3D tray={false} values={view?.dice ?? [3, 4]} rolling={view?.rolling ?? false} />
    </group>
  );
}
