"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import GameShell from "@/components/GameShell";
import BetInput from "@/components/BetInput";
import Scene3DBase from "@/components/three/Scene3DBase";
import { useUser } from "@/lib/UserContext";

// Three.js touches the WebGL canvas directly, so it can only run in the browser.
const HorseRaceScene3D = dynamic(() => import("@/components/three/HorseRaceScene3D"), {
  ssr: false,
  loading: () => <div className="w-full flex items-center justify-center text-muted" style={{ height: 320 }}>Loading track...</div>,
});

interface Horse {
  name: string;
  emoji: string;
  odds: number;
  speedRange: [number, number];
}

const TRACK_LENGTH = 30;

export default function HorseRacingPage() {
  const { user, refresh, pushToast, celebrate } = useUser();
  const [horses, setHorses] = useState<Horse[]>([]);
  const [selected, setSelected] = useState(0);
  const [bet, setBet] = useState(10);
  const [racing, setRacing] = useState(false);
  const [positions, setPositions] = useState<number[]>([]);
  const [result, setResult] = useState<{ won: boolean; payout: number } | null>(null);
  const stepsRef = useRef<number[][]>([]);

  useEffect(() => {
    fetch("/api/games/horse-racing")
      .then((r) => r.json())
      .then((d) => setHorses(d.horses));
  }, []);

  if (!user || horses.length === 0) return <GameShell title="Horse Racing" emoji={"\u{1F407}"}><div className="text-muted">Loading horses...</div></GameShell>;

  async function startRace() {
    setRacing(true);
    setResult(null);
    setPositions(new Array(horses.length).fill(0));
    const res = await fetch("/api/games/horse-racing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bet, horse: selected }),
    });
    const data = await res.json();
    if (!res.ok) {
      setRacing(false);
      pushToast("lose", data.error);
      return;
    }
    stepsRef.current = data.steps;
    let i = 0;
    const interval = setInterval(() => {
      setPositions(stepsRef.current[i]);
      i++;
      if (i >= stepsRef.current.length) {
        clearInterval(interval);
        setRacing(false);
        setResult({ won: data.won, payout: data.payout });
        pushToast(data.won ? "win" : "lose", data.won ? `+$${(data.payout - bet).toLocaleString()}` : `-$${bet.toLocaleString()}`);
        if (data.won) celebrate();
        refresh();
      }
    }, 90);
  }

  return (
    <GameShell title="Horse Racing" emoji={"\u{1F407}"} subtitle="Pick your horse and watch the race play out.">
      <div className="panel p-5">
        <h3 className="text-sm text-muted mb-3">Pick your horse</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          {horses.map((h, i) => (
            <button
              key={h.name}
              onClick={() => !racing && setSelected(i)}
              className={`panel !p-3 text-left transition-colors ${selected === i ? "border-[var(--gold)]" : ""}`}
            >
              <div className="text-2xl">{h.emoji}</div>
              <div className="font-bold text-sm">{h.name}</div>
              <div className="text-xs text-[var(--gold)]">{h.odds}x odds</div>
            </button>
          ))}
        </div>

        <Scene3DBase height={320} cameraPosition={[0, 4.2, 5.4]} fov={48}>
          <HorseRaceScene3D horses={horses} positions={positions} trackLength={TRACK_LENGTH} selected={selected} />
        </Scene3DBase>

        {result && (
          <div className={`mt-4 font-bold animate-in ${result.won ? "text-success" : "text-danger"}`}>
            {result.won ? `\u{1F3C6} Your horse won! +$${(result.payout - bet).toLocaleString()}` : `Your horse lost. -$${bet.toLocaleString()}`}
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <BetInput bet={bet} setBet={setBet} max={user.money} disabled={racing} />
          <button className="btn btn-gold" disabled={racing || bet > user.money} onClick={startRace}>
            {racing ? "Racing..." : "\u{1F3C1} Start Race"}
          </button>
        </div>
      </div>
    </GameShell>
  );
}
