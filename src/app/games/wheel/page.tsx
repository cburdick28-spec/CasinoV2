"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import GameShell from "@/components/GameShell";
import BetInput from "@/components/BetInput";
import { useUser } from "@/lib/UserContext";
import { WHEEL_ORDER } from "@/lib/games/wheel";

// Three.js touches the WebGL canvas directly, so it can only run in the browser.
const Scene3DBase = dynamic(() => import("@/components/three/Scene3DBase"), { ssr: false });
const WheelScene3D = dynamic(() => import("@/components/three/WheelScene3D"), { ssr: false });

export default function WheelPage() {
  const { user, refresh, pushToast, celebrate } = useUser();
  const [bet, setBet] = useState(10);
  const [spinning, setSpinning] = useState(false);
  const [winningIndex, setWinningIndex] = useState<number | null>(null);
  const [landedMult, setLandedMult] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!user) return null;

  async function spin() {
    setSpinning(true);
    setMessage(null);
    setLandedMult(null);

    const res = await fetch("/api/games/wheel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bet }),
    });
    const data = await res.json();

    if (!res.ok) {
      setTimeout(() => {
        setSpinning(false);
        pushToast("lose", data.error);
      }, 3100);
      return;
    }

    // Reveal the real winning segment index to the 3D wheel right away so it
    // can tween its rotation to the true result; `spinning` stays true until
    // the tween has had time to finish, matching the old CSS transition timing.
    setWinningIndex(data.index);

    setTimeout(() => {
      setSpinning(false);
      setLandedMult(data.mult);
      const net = data.payout - bet;
      setMessage(
        data.mult === 0
          ? `\u{1F480} Busted — -$${bet.toLocaleString()}`
          : net >= 0
          ? `\u{1F389} ${data.mult}x — +$${net.toLocaleString()}`
          : `${data.mult}x — -$${Math.abs(net).toLocaleString()}`
      );
      pushToast(net >= 0 ? "win" : "lose", `${data.mult}x — ${net >= 0 ? "+" : ""}$${net.toLocaleString()}`);
      if (data.mult >= 3) celebrate();
      refresh();
    }, 3100);
  }

  return (
    <GameShell title="Wheel" emoji={"\u{1F3A1}"} subtitle="One spin, one multiplier — from a total bust to a 5x payout.">
      <div className="panel p-6 flex flex-col items-center gap-5">
        <Scene3DBase height={340} cameraPosition={[0, 0.4, 5.6]}>
          <WheelScene3D segments={WHEEL_ORDER} winningIndex={winningIndex} spinning={spinning} />
        </Scene3DBase>
        <div
          className="w-20 h-20 -mt-2 rounded-full flex items-center justify-center text-xl font-extrabold"
          style={{
            background: "#0d0d1a",
            border: "3px solid var(--gold)",
            color: landedMult === null ? "var(--muted)" : landedMult === 0 ? "var(--danger)" : "var(--gold)",
          }}
        >
          {spinning ? "\u{1F3A1}" : landedMult !== null ? `${landedMult}x` : "?"}
        </div>

        {message && <div className="font-bold text-lg value-pop">{message}</div>}

        <BetInput bet={bet} setBet={setBet} max={user.money} disabled={spinning} />
        <button className="btn btn-gold text-lg px-8" onClick={spin} disabled={spinning || bet > user.money}>
          {spinning ? "Spinning..." : "\u{1F3A1} Spin"}
        </button>
      </div>

      <div className="panel p-5 text-sm text-muted">
        <p>A single spin lands on one multiplier — anywhere from a total bust (0x) up to 5x your bet. Higher multipliers are rarer.</p>
      </div>
    </GameShell>
  );
}
