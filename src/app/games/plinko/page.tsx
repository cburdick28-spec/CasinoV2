"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import GameShell from "@/components/GameShell";
import BetInput from "@/components/BetInput";
import Scene3DBase from "@/components/three/Scene3DBase";
import { useUser } from "@/lib/UserContext";

// Three.js touches the WebGL canvas directly, so it can only run in the browser.
const PlinkoScene3D = dynamic(() => import("@/components/three/PlinkoScene3D"), {
  ssr: false,
  loading: () => null,
});

const ROWS = 12;
const MAX_BALLS = 10;
const BALL_COLORS = ["#ffd54a", "#ff5470", "#34d399", "#60a5fa", "#c084fc", "#fb923c", "#f472b6", "#a3e635", "#22d3ee", "#f87171"];
type Risk = "low" | "medium" | "high";

const MULTIPLIERS: Record<Risk, number[]> = {
  low: [8, 3, 1.5, 1.2, 1, 0.5, 0.3, 0.5, 1, 1.2, 1.5, 3, 8],
  medium: [24, 8, 3, 1.5, 0.7, 0.4, 0.2, 0.4, 0.7, 1.5, 3, 8, 24],
  high: [76, 15, 6, 2, 0.5, 0.2, 0.1, 0.2, 0.5, 2, 6, 15, 76],
};

interface BallResult {
  path: number[];
  bucket: number;
  multiplier: number;
  payout: number;
}

interface LiveBall {
  x: number;
  row: number;
  color: string;
}

export default function PlinkoPage() {
  const { user, refresh, pushToast, celebrate } = useUser();
  const [bet, setBet] = useState(10);
  const [ballCount, setBallCount] = useState(1);
  const [risk, setRisk] = useState<Risk>("medium");
  const [dropping, setDropping] = useState(false);
  const [liveBalls, setLiveBalls] = useState<LiveBall[]>([]);
  const [landedBuckets, setLandedBuckets] = useState<number[]>([]);
  const [summary, setSummary] = useState<{ totalStake: number; totalPayout: number; results: BallResult[] } | null>(null);

  if (!user) return null;

  const totalCost = bet * ballCount;

  async function drop() {
    setDropping(true);
    setSummary(null);
    setLandedBuckets([]);
    const res = await fetch("/api/games/plinko", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bet, risk, balls: ballCount }),
    });
    const data = await res.json();
    if (!res.ok) {
      setDropping(false);
      return pushToast("lose", data.error);
    }

    const results: BallResult[] = data.results;
    setLiveBalls(results.map((_, i) => ({ x: 50, row: -1, color: BALL_COLORS[i % BALL_COLORS.length] })));

    let row = 0;
    const step = () => {
      if (row >= ROWS) {
        setDropping(false);
        setLandedBuckets(results.map((r) => r.bucket));
        setSummary({ totalStake: data.totalStake, totalPayout: data.totalPayout, results });
        const net = data.totalPayout - data.totalStake;
        pushToast(net >= 0 ? "win" : "lose", `${net >= 0 ? "+" : ""}$${net.toLocaleString()}`);
        const table = MULTIPLIERS[risk];
        if (results.some((r) => r.multiplier >= Math.max(...table) * 0.5)) celebrate();
        refresh();
        return;
      }
      setLiveBalls((balls) =>
        balls.map((b, i) => {
          const shift = results[i].path[row] === 1 ? 1 : -1;
          return { ...b, x: b.x + shift * (50 / (ROWS + 2)), row };
        })
      );
      row++;
      setTimeout(step, 180);
    };
    step();
  }

  const table = MULTIPLIERS[risk];
  const bucketCounts = new Array(table.length).fill(0);
  for (const b of landedBuckets) bucketCounts[b]++;

  return (
    <GameShell title="Plinko" emoji={"\u{1F3B3}"} subtitle="Drop one ball or many at once — where each lands sets its own multiplier.">
      <div className="panel p-6 flex flex-col items-center gap-4">
        <div className="w-full max-w-lg">
          <Scene3DBase height={320} cameraPosition={[0, 0.4, 7.5]} fov={40}>
            <PlinkoScene3D rows={ROWS} liveBalls={liveBalls} bucketCount={table.length} />
          </Scene3DBase>
        </div>

        <div className="grid grid-cols-[repeat(13,minmax(0,1fr))] gap-1 w-full max-w-lg text-[10px] text-center">
          {table.map((m, i) => (
            <div key={i} className={`py-1 rounded font-bold relative ${bucketCounts[i] > 0 ? "bg-[var(--gold)] text-black" : "bg-white/5"}`}>
              {m}x
              {bucketCounts[i] > 1 && (
                <span className="absolute -top-2 -right-1 bg-[var(--danger)] text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px]">
                  {bucketCounts[i]}
                </span>
              )}
            </div>
          ))}
        </div>

        {summary && (
          <div className={`font-bold value-pop text-center ${summary.totalPayout >= summary.totalStake ? "text-success" : "text-danger"}`}>
            {summary.totalPayout >= summary.totalStake ? "+" : ""}
            ${(summary.totalPayout - summary.totalStake).toLocaleString()} across {summary.results.length} ball
            {summary.results.length === 1 ? "" : "s"}
            <div className="text-xs text-muted font-normal mt-1">
              {summary.results.map((r) => `${r.multiplier}x`).join(", ")}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {(["low", "medium", "high"] as Risk[]).map((r) => (
            <button key={r} className={`btn ${risk === r ? "btn-gold" : "btn-ghost"} capitalize`} disabled={dropping} onClick={() => setRisk(r)}>
              {r}
            </button>
          ))}
        </div>

        <div className="flex flex-col items-center gap-2">
          <label className="text-sm text-muted">Balls</label>
          <div className="flex flex-wrap gap-1 justify-center">
            {[1, 2, 3, 5, 10].filter((n) => n <= MAX_BALLS).map((n) => (
              <button
                key={n}
                className={`btn !py-1 !px-3 text-sm ${ballCount === n ? "btn-gold" : "btn-ghost"}`}
                disabled={dropping}
                onClick={() => setBallCount(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <BetInput bet={bet} setBet={setBet} max={Math.floor(user.money / ballCount) || 1} disabled={dropping} />
          <button className="btn btn-gold" disabled={dropping || totalCost > user.money} onClick={drop}>
            {dropping ? "Dropping..." : `Drop ${ballCount > 1 ? `${ballCount} Balls` : "Ball"} — $${totalCost.toLocaleString()}`}
          </button>
        </div>
      </div>
    </GameShell>
  );
}
