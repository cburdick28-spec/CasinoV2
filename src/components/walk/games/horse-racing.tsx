"use client";

import { useEffect, useRef } from "react";
import HorseRaceScene3D from "@/components/three/HorseRaceScene3D";
import { useActionHandler, useGameController } from "./useGameController";
import { useGameView, type GameBar, type Vec3 } from "./bridge";

/** Sat at the oval table, looking down the straight track laid on it. */
export const camera: { eye: Vec3; target: Vec3 } = { eye: [0, 2.2, 1.9], target: [0, 0.1, 0.15] };

const TRACK_LENGTH = 30;
const STEP_MS = 110;
const money = (n: number) => `$${n.toLocaleString()}`;

interface Horse {
  name: string;
  emoji: string;
  odds: number;
  speedRange: [number, number];
}
interface View {
  horses: Horse[];
  positions: number[];
  selected: number;
}

function barFor(horses: Horse[], selected: number): GameBar {
  return {
    bet: true,
    betLocked: false,
    choices: [{ id: "horse", label: "Horse", items: horses.map((h, i) => ({ id: String(i), label: `${h.emoji} ${h.name} ${h.odds}x`, active: i === selected })) }],
    buttons: [{ id: "race", label: "\u{1F3C1} Start Race", primary: true, disabled: horses.length === 0 }],
    hint: "Left/Right picks your horse · Esc or W A S D to step away",
  };
}

export function Controller() {
  const g = useGameController("horse-racing");
  const horses = useRef<Horse[]>([]);
  const selected = useRef(0);
  const positions = useRef<number[]>([]);
  const alive = useRef(true);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const publish = () => {
    g.setView({ horses: horses.current, positions: positions.current, selected: selected.current } satisfies View);
    g.update(barFor(horses.current, selected.current));
  };

  // The 2D page loads the field of horses on mount.
  useEffect(() => {
    alive.current = true;
    g.setBar({ status: "Loading horses...", hint: "Esc or W A S D to step away" });
    void g.request<{ horses?: Horse[] }>("GET").then((res) => {
      if (!alive.current) return;
      if (!res.ok || !res.data.horses?.length) {
        g.message("lose", "Could not load the horses, try again");
        return;
      }
      horses.current = res.data.horses;
      positions.current = [];
      publish();
    });
    return () => {
      alive.current = false;
      if (timer.current) clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g]);

  async function race() {
    if (!horses.current.length) return;
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
    g.clearMessage();
    positions.current = new Array(horses.current.length).fill(0);
    publish();
    const res = await g.request<{ steps?: number[][]; won?: boolean; payout?: number; winnerIdx?: number; error?: string }>("POST", { bet, horse: selected.current });
    if (!res.ok || !res.data.steps?.length) {
      g.setBusy(false);
      const err = res.data.error || "The race was called off, try again";
      g.message("lose", err);
      g.toast("lose", err);
      return;
    }
    const { steps, won, payout = 0, winnerIdx } = res.data;
    let i = 0;
    timer.current = setInterval(() => {
      positions.current = steps[i];
      i++;
      g.setView({ horses: horses.current, positions: positions.current, selected: selected.current } satisfies View);
      if (i < steps.length) return;
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
      // Let the last glide finish before announcing the winner.
      setTimeout(() => {
        if (!alive.current) return;
        g.setBusy(false);
        const winner = winnerIdx !== undefined ? horses.current[winnerIdx]?.name : undefined;
        if (won) {
          g.message("win", `\u{1F3C6} Your horse won! +${money(payout - bet)}`);
          g.toast("win", `+${money(payout - bet)}`);
          g.celebrate();
        } else {
          g.message("lose", `Your horse lost${winner ? ` (${winner} won)` : ""}. -${money(bet)}`);
          g.toast("lose", `-${money(bet)}`);
        }
        g.refresh();
      }, 500);
    }, STEP_MS);
  }

  useActionHandler((id) => {
    if (id === "race") void race();
    else if (id.startsWith("horse:")) {
      selected.current = Number(id.slice(6));
      publish();
    }
  });

  return null;
}

/** The existing straight track, laid over the oval table. */
export function Stage() {
  const view = useGameView<View>();
  if (!view || view.horses.length === 0) return null;
  return (
    <group position={[0, 0.965, 0]} scale={0.4}>
      <HorseRaceScene3D horses={view.horses} positions={view.positions} trackLength={TRACK_LENGTH} selected={view.selected} smooth />
    </group>
  );
}
