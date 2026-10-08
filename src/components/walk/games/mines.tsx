"use client";

import { useEffect, useRef } from "react";
import MinesScene3D from "@/components/three/MinesScene3D";
import { useActionHandler, useGameController } from "./useGameController";
import { dispatchAction, getSession, useGameSession, useGameView, type GameBar, type Vec3 } from "./bridge";

/** Sat at the pedestal, looking down at the 5x5 board floating over it. */
export const camera: { eye: Vec3; target: Vec3 } = { eye: [0, 2.6, 2.3], target: [0, -0.7, 0.1] };

const GRID_SIZE = 25;
const MINE_OPTIONS = [1, 3, 5, 10, 15, 24];
const money = (n: number) => `$${n.toLocaleString()}`;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

interface MinesStateView {
  bet: number;
  minesCount: number;
  revealed: number[];
  multiplier: number;
  payout: number;
  nextMultiplier: number;
}
interface View {
  /** The live round (null between rounds). */
  state: MinesStateView | null;
  /** After a round ends: where the mines were (the finished board stays on show). */
  mines: number[] | null;
  /** Safe tiles of the finished round, kept on the board. */
  finished: number[];
  flashTile: number | null;
}

/* ------------------------------ DOM side: logic ------------------------------ */

function barFor(st: MinesStateView | null, minesCount: number): GameBar {
  if (!st) {
    return {
      bet: true,
      betLocked: false,
      choices: [{ id: "mines", label: "Mines", items: MINE_OPTIONS.map((m) => ({ id: String(m), label: String(m), active: m === minesCount })) }],
      buttons: [{ id: "start", label: "Start Round", primary: true }],
      hint: "Esc or W A S D to step away",
    };
  }
  return {
    bet: true,
    betLocked: true,
    status: `Mines: ${st.minesCount} · Multiplier: ${st.multiplier.toFixed(2)}x · Next tile: ${st.nextMultiplier.toFixed(2)}x`,
    buttons: [{ id: "cashout", label: `Cash Out ${money(st.payout)}`, primary: true, disabled: st.revealed.length === 0 }],
    picker: { id: "tile", label: "Reveal a tile (or click it on the board)", count: GRID_SIZE, cols: 5, selected: st.revealed.map((t) => t + 1) },
    hint: "Click a tile on the board, or pick its number below · E cashes out",
  };
}

export function Controller() {
  const g = useGameController("mines");
  const minesCount = useRef(5);
  const live = useRef<MinesStateView | null>(null);
  const alive = useRef(true);

  const publish = (view: View) => {
    live.current = view.state;
    g.setView(view);
    g.update(barFor(view.state, minesCount.current));
  };

  // Pick up a round that is still running on the server.
  useEffect(() => {
    alive.current = true;
    g.setBar(barFor(null, minesCount.current));
    g.setView({ state: null, mines: null, finished: [], flashTile: null } satisfies View);
    void g.request<{ state?: MinesStateView }>("GET").then((res) => {
      if (alive.current && res.ok && res.data.state) publish({ state: res.data.state, mines: null, finished: [], flashTile: null });
    });
    return () => {
      alive.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g]);

  async function start() {
    if (!g.user()) {
      g.message("info", "Log in to place a bet");
      return;
    }
    if (g.bet() > g.balance()) {
      g.message("lose", "Not enough balance for that bet");
      return;
    }
    g.setBusy(true);
    g.clearMessage();
    const res = await g.request<{ state?: MinesStateView; error?: string }>("POST", { action: "start", bet: g.bet(), mines: minesCount.current });
    g.setBusy(false);
    if (!res.ok || !res.data.state) {
      const err = res.data.error || "Something went wrong";
      g.message("lose", err);
      g.toast("lose", err);
      return;
    }
    publish({ state: res.data.state, mines: null, finished: [], flashTile: null });
    g.refresh();
  }

  async function reveal(tile: number) {
    const st = live.current;
    if (!st || st.revealed.includes(tile) || getSession().busy) return;
    g.setBusy(true);
    const res = await g.request<{
      hit?: boolean;
      cleared?: boolean;
      payout?: number;
      mines?: number[];
      revealed?: number[];
      state?: MinesStateView;
      error?: string;
    }>("POST", { action: "reveal", tile });
    if (!res.ok) {
      g.setBusy(false);
      const err = res.data.error || "Something went wrong";
      g.message("lose", err);
      g.toast("lose", err);
      return;
    }
    const d = res.data;

    if (d.hit) {
      // Show the mines blowing open, then settle.
      publish({ state: null, mines: d.mines ?? [], finished: d.revealed ?? st.revealed, flashTile: null });
      await sleep(700);
      if (!alive.current) return;
      g.message("lose", `\u{1F4A3} Boom! -${money(st.bet)}`);
      g.toast("lose", `Hit a mine — -${money(st.bet)}`);
      g.setBusy(false);
      g.refresh();
      return;
    }

    if (d.cleared) {
      const net = (d.payout ?? 0) - st.bet;
      publish({ state: null, mines: d.mines ?? [], finished: d.revealed ?? [], flashTile: tile });
      await sleep(700);
      if (!alive.current) return;
      g.message("win", `\u{1F3C6} Board cleared! +${money(net)}`);
      g.toast("win", `Cleared the board! +${money(net)}`);
      g.celebrate();
      g.setBusy(false);
      g.refresh();
      return;
    }

    if (!d.state) {
      g.setBusy(false);
      g.message("lose", "Something went wrong");
      return;
    }
    publish({ state: d.state, mines: null, finished: [], flashTile: tile });
    await sleep(420);
    if (!alive.current) return;
    g.setView({ state: d.state, mines: null, finished: [], flashTile: null } satisfies View);
    g.setBusy(false);
    if (d.state.multiplier >= 5) g.celebrate();
    g.refresh();
  }

  async function cashout() {
    const st = live.current;
    if (!st) return;
    g.setBusy(true);
    const res = await g.request<{ payout?: number; mines?: number[]; error?: string }>("POST", { action: "cashout" });
    if (!res.ok) {
      g.setBusy(false);
      const err = res.data.error || "Something went wrong";
      g.message("lose", err);
      g.toast("lose", err);
      return;
    }
    const payout = res.data.payout ?? 0;
    const net = payout - st.bet;
    publish({ state: null, mines: res.data.mines ?? null, finished: st.revealed, flashTile: null });
    g.message("win", `✅ Cashed out +${money(net)}`);
    g.toast("win", `Cashed out +${money(net)}`);
    if (payout >= st.bet * 3) g.celebrate();
    g.setBusy(false);
    g.refresh();
  }

  useActionHandler((id) => {
    if (id === "start") void start();
    else if (id === "cashout") void cashout();
    else if (id.startsWith("tile:")) void reveal(Number(id.slice(5)) - 1);
    else if (id.startsWith("tileidx:")) void reveal(Number(id.slice(8)));
    else if (id.startsWith("mines:")) {
      minesCount.current = Number(id.slice(6));
      g.update(barFor(live.current, minesCount.current));
    }
  });

  return null;
}

/* ------------------------------ Canvas side: 3D ------------------------------ */

/** The existing mines board, tilted toward the player on top of the pedestal. Tiles are clickable. */
export function Stage() {
  const view = useGameView<View>();
  const busy = useGameSession((s) => s.busy);
  if (!view) return null;
  return (
    <group position={[0, 1.02, 0.12]} rotation={[0.36, 0, 0]} scale={0.26}>
      <MinesScene3D
        gridSize={GRID_SIZE}
        cols={5}
        revealed={view.state?.revealed ?? view.finished}
        mines={view.mines}
        flashTile={view.flashTile}
        disabled={!view.state || busy}
        onReveal={(t) => dispatchAction(`tileidx:${t}`)}
      />
    </group>
  );
}
