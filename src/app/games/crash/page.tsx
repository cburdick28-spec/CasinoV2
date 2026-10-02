"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import GameShell from "@/components/GameShell";
import BetInput from "@/components/BetInput";
import Scene3DBase from "@/components/three/Scene3DBase";
import { useUser } from "@/lib/UserContext";

// Three.js touches the WebGL canvas directly, so it can only run in the browser.
const CrashScene3D = dynamic(() => import("@/components/three/CrashScene3D"), {
  ssr: false,
  loading: () => <div className="w-full flex items-center justify-center text-muted" style={{ height: 300 }}>Fueling rocket...</div>,
});

export default function CrashPage() {
  const { user, refresh, pushToast } = useUser();
  const [bet, setBet] = useState(10);
  const [active, setActive] = useState(false);
  const [multiplier, setMultiplier] = useState(1);
  const [crashed, setCrashed] = useState<number | null>(null);
  const [cashedOutAt, setCashedOutAt] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  if (!user) return null;

  function startPolling() {
    pollRef.current = setInterval(async () => {
      const res = await fetch("/api/games/crash");
      const data = await res.json();
      if (data.crashed) {
        clearInterval(pollRef.current!);
        setActive(false);
        setCrashed(data.crashPoint);
        pushToast("lose", `Crashed at ${data.crashPoint.toFixed(2)}x`);
        refresh();
      } else if (data.state) {
        setMultiplier(data.state.multiplier);
      }
    }, 150);
  }

  async function placeBet() {
    setBusy(true);
    setCrashed(null);
    setCashedOutAt(null);
    const res = await fetch("/api/games/crash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "bet", bet }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return pushToast("lose", data.error);
    setMultiplier(1);
    setActive(true);
    refresh();
    startPolling();
  }

  async function cashout() {
    if (pollRef.current) clearInterval(pollRef.current);
    setBusy(true);
    const res = await fetch("/api/games/crash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cashout" }),
    });
    const data = await res.json();
    setBusy(false);
    setActive(false);
    if (!res.ok) return pushToast("lose", data.error);
    if (data.crashed) {
      setCrashed(data.crashPoint);
      pushToast("lose", `Crashed at ${data.crashPoint.toFixed(2)}x — too slow!`);
    } else {
      setCashedOutAt(data.cashedOutAt);
      pushToast("win", `Cashed out at ${data.cashedOutAt.toFixed(2)}x — +$${(data.payout - bet).toLocaleString()}`);
    }
    refresh();
  }

  return (
    <GameShell title="Crash" emoji={"\u{1F680}"} subtitle="Cash out before the rocket crashes. The longer you wait, the higher the multiplier — and the risk.">
      <div className={`panel p-10 flex flex-col items-center gap-6 relative overflow-hidden ${crashed ? "flash-red" : ""}`}>
        <Scene3DBase height={260} cameraPosition={[0, 2.6, 6.5]} fov={44}>
          <CrashScene3D active={active} multiplier={multiplier} crashed={crashed} cashedOutAt={cashedOutAt} />
        </Scene3DBase>
        <div
          className={`text-6xl font-black tabular-nums ${crashed ? "shake" : ""}`}
          style={{ color: crashed ? "var(--danger)" : active ? "var(--success)" : "var(--muted)" }}
        >
          {crashed ? `\u{1F4A5} ${crashed.toFixed(2)}x` : `${multiplier.toFixed(2)}x`}
        </div>
        <div className="w-full max-w-md h-2 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full transition-all"
            style={{
              width: `${Math.min(100, (multiplier - 1) * 8)}%`,
              background: active ? "linear-gradient(90deg,#34d399,#ffd54a,#ff5470)" : "var(--border)",
            }}
          />
        </div>

        {active ? (
          <button className="btn btn-gold text-lg px-10" disabled={busy} onClick={cashout}>
            Cash Out @ {multiplier.toFixed(2)}x
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <BetInput bet={bet} setBet={setBet} max={user.money} disabled={busy} />
            <button className="btn btn-gold" disabled={busy || bet > user.money} onClick={placeBet}>
              Place Bet
            </button>
          </div>
        )}
      </div>
    </GameShell>
  );
}
