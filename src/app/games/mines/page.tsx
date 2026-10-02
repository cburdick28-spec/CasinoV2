"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import GameShell from "@/components/GameShell";
import BetInput from "@/components/BetInput";
import Scene3DBase from "@/components/three/Scene3DBase";
import { useUser } from "@/lib/UserContext";

// Three.js touches the WebGL canvas directly, so it can only run in the browser.
const MinesScene3D = dynamic(() => import("@/components/three/MinesScene3D"), {
  ssr: false,
  loading: () => null,
});

const GRID_SIZE = 25;
const MINE_OPTIONS = [1, 3, 5, 10, 15, 24];

interface MinesStateView {
  bet: number;
  minesCount: number;
  revealed: number[];
  multiplier: number;
  payout: number;
  nextMultiplier: number;
}

export default function MinesPage() {
  const { user, refresh, pushToast, celebrate } = useUser();
  const [bet, setBet] = useState(10);
  const [minesCount, setMinesCount] = useState(5);
  const [state, setState] = useState<MinesStateView | null>(null);
  const [revealedMines, setRevealedMines] = useState<number[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [flashTile, setFlashTile] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/games/mines")
      .then((r) => r.json())
      .then((d) => d.state && setState(d.state));
  }, []);

  if (!user) return null;

  async function start() {
    setBusy(true);
    setMessage(null);
    setRevealedMines(null);
    const res = await fetch("/api/games/mines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start", bet, mines: minesCount }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return pushToast("lose", data.error);
    setState(data.state);
    refresh();
  }

  async function reveal(tile: number) {
    if (!state || busy || state.revealed.includes(tile)) return;
    setBusy(true);
    const res = await fetch("/api/games/mines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reveal", tile }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return pushToast("lose", data.error);

    if (data.hit) {
      setRevealedMines(data.mines);
      setState(null);
      setMessage(`\u{1F4A3} Boom! -$${state.bet.toLocaleString()}`);
      setShake(true);
      pushToast("lose", `Hit a mine — -$${state.bet.toLocaleString()}`);
      setTimeout(() => setShake(false), 550);
      refresh();
      return;
    }

    setFlashTile(tile);
    setTimeout(() => setFlashTile(null), 350);

    if (data.cleared) {
      setRevealedMines(data.mines);
      setState(null);
      setMessage(`\u{1F3C6} Board cleared! +$${(data.payout - state.bet).toLocaleString()}`);
      pushToast("win", `Cleared the board! +$${(data.payout - state.bet).toLocaleString()}`);
      celebrate();
      refresh();
      return;
    }

    setState(data.state);
    if (data.state.multiplier >= 5) celebrate();
    refresh();
  }

  async function cashout() {
    if (!state) return;
    setBusy(true);
    const res = await fetch("/api/games/mines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cashout" }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return pushToast("lose", data.error);
    setMessage(`✅ Cashed out +$${(data.payout - state.bet).toLocaleString()}`);
    pushToast("win", `Cashed out +$${(data.payout - state.bet).toLocaleString()}`);
    if (data.payout >= state.bet * 3) celebrate();
    setRevealedMines(null);
    setState(null);
    refresh();
  }

  return (
    <GameShell title="Mines" emoji={"\u{1F4A3}"} subtitle="Reveal gems while dodging mines — cash out any time, the more you reveal the higher the multiplier.">
      <div className={`panel p-6 flex flex-col items-center gap-5 ${shake ? "shake" : ""}`}>
        {!state && (
          <div className="flex flex-col items-center gap-3">
            <div className="flex flex-wrap gap-2 items-center">
              <label className="text-sm text-muted">Mines</label>
              {MINE_OPTIONS.map((m) => (
                <button
                  key={m}
                  className={`btn !py-1 !px-3 text-sm ${minesCount === m ? "btn-gold" : "btn-ghost"}`}
                  disabled={busy}
                  onClick={() => setMinesCount(m)}
                >
                  {m}
                </button>
              ))}
            </div>
            <BetInput bet={bet} setBet={setBet} max={user.money} disabled={busy} />
            <button className="btn btn-gold" disabled={busy || bet > user.money} onClick={start}>
              Start Round
            </button>
          </div>
        )}

        {message && <div className="font-bold text-lg value-pop">{message}</div>}

        {state && (
          <div className="flex flex-col items-center gap-3 w-full">
            <div className="text-sm text-muted">
              Mines: <span className="text-[var(--gold)] font-bold">{state.minesCount}</span> &middot; Multiplier:{" "}
              <span className="text-[var(--gold)] font-bold count-up">{state.multiplier.toFixed(2)}x</span> &middot; Next tile:{" "}
              <span className="text-success font-bold">{state.nextMultiplier.toFixed(2)}x</span>
            </div>
            <button
              className="btn btn-gold"
              disabled={busy || state.revealed.length === 0}
              onClick={cashout}
            >
              Cash Out ${state.payout.toLocaleString()}
            </button>
          </div>
        )}

        <Scene3DBase height={360} cameraPosition={[0, 5.4, 5.8]} fov={45}>
          <MinesScene3D
            gridSize={GRID_SIZE}
            cols={5}
            revealed={state?.revealed ?? []}
            mines={revealedMines}
            flashTile={flashTile}
            disabled={!state || busy}
            onReveal={reveal}
          />
        </Scene3DBase>
      </div>

      <div className="panel p-5 text-sm text-muted">
        <p>Pick how many mines are hidden on the 5x5 board, place your bet, and start revealing tiles. Each safe tile raises your multiplier — the more mines you chose, the faster it climbs. Cash out any time; hit a mine and you lose your bet.</p>
      </div>
    </GameShell>
  );
}
