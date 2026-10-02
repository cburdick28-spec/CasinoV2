"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import GameShell from "@/components/GameShell";
import BetInput from "@/components/BetInput";
import Scene3DBase from "@/components/three/Scene3DBase";
import { useUser } from "@/lib/UserContext";

// Three.js touches the WebGL canvas directly, so it can only run in the browser.
const CoinScene3D = dynamic(() => import("@/components/three/CoinScene3D"), {
  ssr: false,
  loading: () => <div className="w-full flex items-center justify-center text-muted" style={{ height: 220 }}>Minting coin...</div>,
});

interface CoinState {
  bet: number;
  pot: number;
  streak: number;
}

const FLIP_DURATION = 1100;
const SPINS = 4; // full rotations before settling, purely visual

export default function CoinFlipPage() {
  const { user, refresh, pushToast, celebrate } = useUser();
  const [bet, setBet] = useState(10);
  const [side, setSide] = useState<"heads" | "tails">("heads");
  const [state, setState] = useState<CoinState | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [flipping, setFlipping] = useState(false);
  const [rotation, setRotation] = useState(0);

  if (!user) return null;

  async function flip() {
    setBusy(true);
    const res = await fetch("/api/games/coinflip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "flip", side, bet: state ? undefined : bet }),
    });
    const data = await res.json();

    if (!res.ok) {
      setBusy(false);
      return pushToast("lose", data.error);
    }

    // Land exactly on the correct face: heads = 0deg mod 360, tails = 180deg mod 360.
    const targetMod = data.result === "tails" ? 180 : 0;
    setFlipping(true);
    setRotation((prev) => {
      const currentMod = ((prev % 360) + 360) % 360;
      let delta = targetMod - currentMod;
      if (delta <= 0) delta += 360;
      return prev + SPINS * 360 + delta;
    });

    setTimeout(() => {
      setBusy(false);
      setFlipping(false);
      setLastResult(data.result);
      if (data.win) {
        setState(data.state);
        pushToast("win", `${data.result}! Streak ${data.state.streak} — pot $${data.state.pot.toLocaleString()}`);
        if (data.state.streak >= 4) celebrate();
      } else {
        setState(null);
        pushToast("lose", `${data.result}! Lost $${(state?.bet ?? bet).toLocaleString()}`);
      }
      refresh();
    }, FLIP_DURATION);
  }

  async function cashout() {
    setBusy(true);
    const res = await fetch("/api/games/coinflip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cashout" }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return pushToast("lose", data.error);
    pushToast("win", `Cashed out $${data.payout.toLocaleString()}`);
    setState(null);
    refresh();
  }

  return (
    <GameShell title="Coin Flip" emoji={"\u{1FA99}"} subtitle="Call it right and keep the streak going — each win multiplies your pot by 1.95x. Cash out any time.">
      <div className="panel p-8 flex flex-col items-center gap-6">
        <Scene3DBase height={220} cameraPosition={[0, 0.3, 3.4]} fov={36}>
          <CoinScene3D rotation={rotation} flipping={flipping} />
        </Scene3DBase>
        {lastResult && !flipping && <div className="font-bold value-pop">Last flip: {lastResult}</div>}

        {state ? (
          <div className="flex flex-col items-center gap-3">
            <div className="text-lg">
              Streak <span className="text-[var(--gold)] font-bold">{state.streak}</span> &middot; Pot{" "}
              <span className="text-[var(--gold)] font-bold">${state.pot.toLocaleString()}</span>
            </div>
            <div className="flex gap-2">
              <button className={`btn ${side === "heads" ? "btn-gold" : "btn-ghost"}`} disabled={busy} onClick={() => setSide("heads")}>
                Heads
              </button>
              <button className={`btn ${side === "tails" ? "btn-gold" : "btn-ghost"}`} disabled={busy} onClick={() => setSide("tails")}>
                Tails
              </button>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-accent" disabled={busy} onClick={flip}>
                Flip Again
              </button>
              <button className="btn btn-gold" disabled={busy} onClick={cashout}>
                Cash Out ${state.pot.toLocaleString()}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="flex gap-2">
              <button className={`btn ${side === "heads" ? "btn-gold" : "btn-ghost"}`} disabled={busy} onClick={() => setSide("heads")}>
                Heads
              </button>
              <button className={`btn ${side === "tails" ? "btn-gold" : "btn-ghost"}`} disabled={busy} onClick={() => setSide("tails")}>
                Tails
              </button>
            </div>
            <BetInput bet={bet} setBet={setBet} max={user.money} disabled={busy} />
            <button className="btn btn-gold" disabled={busy || bet > user.money} onClick={flip}>
              Flip
            </button>
          </div>
        )}
      </div>
    </GameShell>
  );
}
