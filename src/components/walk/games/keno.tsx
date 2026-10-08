"use client";

import { useEffect, useRef } from "react";
import KenoScene3D from "@/components/three/KenoScene3D";
import { KENO_MAX_NUMBER, KENO_MAX_PICKS, PAYTABLE } from "@/lib/games/keno";
import { FONT_URL } from "../stations/common";
import { useActionHandler, useGameController } from "./useGameController";
import { useGameSession, useGameView, type GameBar, type Vec3 } from "./bridge";

/** Sat at the counter, looking at the tumbling cage; drawn balls roll out into a rail in front of it. */
export const camera: { eye: Vec3; target: Vec3 } = { eye: [0, 1.5, 2.4], target: [0, 0.08, 0] };

const money = (n: number) => `$${n.toLocaleString()}`;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

interface View {
  picks: number[];
  drawn: number[];
}

function barFor(picks: number[], drawn: number[]): GameBar {
  const table = PAYTABLE[picks.length] ?? [];
  const pays = table.map((m, hits) => (m > 0 ? `${hits} hit${hits === 1 ? "" : "s"}: ${m}x` : null)).filter(Boolean);
  const drawnLine = drawn.length ? `Drawn: ${drawn.map((n) => (picks.includes(n) ? `[${n}]` : n)).join(" ")}` : "";
  return {
    bet: true,
    betLocked: false,
    status: [`${picks.length} / ${KENO_MAX_PICKS} picked`, drawnLine].filter(Boolean).join("  ·  "),
    buttons: [
      { id: "play", label: "Play", primary: true, disabled: picks.length === 0 },
      { id: "auto", label: "\u{1F3B2} Auto-pick 6" },
      { id: "clear", label: "Clear", disabled: picks.length === 0 },
    ],
    picker: { id: "pick", label: `Pick up to ${KENO_MAX_PICKS} numbers from 1-${KENO_MAX_NUMBER}  ·  10 are drawn`, count: KENO_MAX_NUMBER, cols: 10, selected: picks },
    hint: pays.length ? `${pays.join("  ·  ")}` : "Pick your numbers, then Play",
  };
}

export function Controller() {
  const g = useGameController("keno");
  const picks = useRef<number[]>([]);
  const drawn = useRef<number[]>([]);
  const alive = useRef(true);

  const publish = () => {
    g.setView({ picks: picks.current, drawn: drawn.current } satisfies View);
    g.update(barFor(picks.current, drawn.current));
  };

  useEffect(() => {
    alive.current = true;
    g.setBar(barFor([], []));
    g.setView({ picks: [], drawn: [] } satisfies View);
    return () => {
      alive.current = false;
    };
  }, [g]);

  async function play() {
    if (picks.current.length === 0) return;
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
    drawn.current = [];
    publish();
    const res = await g.request<{ drawn?: number[]; hits?: number; mult?: number; payout?: number; error?: string }>("POST", { bet, picks: picks.current });
    if (!res.ok || !Array.isArray(res.data.drawn)) {
      g.setBusy(false);
      const err = res.data.error || "Something went wrong";
      g.message("lose", err);
      g.toast("lose", err);
      return;
    }
    const { drawn: balls, hits = 0, mult = 0, payout = 0 } = res.data;
    // Same cadence as the 2D page: one ball every 220 ms.
    for (let i = 1; i <= balls.length; i++) {
      await sleep(220);
      if (!alive.current) return;
      drawn.current = balls.slice(0, i);
      publish();
    }
    await sleep(500); // let the last ball settle
    if (!alive.current) return;
    const net = payout - bet;
    g.message(
      hits === 0 ? "lose" : net >= 0 ? "win" : "info",
      hits === 0 ? `No matches — -${money(bet)}` : `${hits} hit${hits === 1 ? "" : "s"} — ${net >= 0 ? "+" : "-"}${money(Math.abs(net))}`
    );
    g.toast(net >= 0 ? "win" : "lose", `${hits} hits — ${net >= 0 ? "+" : "-"}${money(Math.abs(net))}`);
    if (mult >= 20) g.celebrate();
    g.setBusy(false);
    g.refresh();
  }

  useActionHandler((id) => {
    if (id === "play") {
      void play();
    } else if (id === "auto") {
      const nums = new Set<number>();
      while (nums.size < 6) nums.add(1 + Math.floor(Math.random() * KENO_MAX_NUMBER));
      picks.current = Array.from(nums).sort((a, b) => a - b);
      drawn.current = [];
      g.clearMessage();
      publish();
    } else if (id === "clear") {
      picks.current = [];
      drawn.current = [];
      publish();
    } else if (id.startsWith("pick:")) {
      const n = Number(id.slice(5));
      const p = picks.current;
      picks.current = p.includes(n) ? p.filter((x) => x !== n) : p.length < KENO_MAX_PICKS ? [...p, n] : p;
      drawn.current = [];
      g.clearMessage();
      publish();
    }
  });

  return null;
}

/** The existing cage + ejecting numbered balls, standing in for the cabinet's decorative cage. */
export function Stage() {
  const view = useGameView<View>();
  const busy = useGameSession((s) => s.busy);
  if (!view) return null;
  return (
    <group position={[0, 0.72, 0]} scale={0.6}>
      <KenoScene3D
        drawn={view.drawn}
        picks={view.picks}
        spinning={busy}
        font={FONT_URL}
        spacing={0.2}
        trayZ={1.1}
        trayY={0.68}
        ballScale={0.52}
        tray={false}
      />
      {/* little gold rail the drawn balls rest on */}
      <mesh position={[0, 0.55, 1.1]}>
        <boxGeometry args={[2.3, 0.05, 0.25]} />
        <meshStandardMaterial color="#c9a227" metalness={0.6} roughness={0.35} />
      </mesh>
    </group>
  );
}
