"use client";

import { useState } from "react";
import GameShell from "@/components/GameShell";
import BetInput from "@/components/BetInput";
import { useUser } from "@/lib/UserContext";

const ROWS = 12;
type Risk = "low" | "medium" | "high";

const MULTIPLIERS: Record<Risk, number[]> = {
  low: [8, 3, 1.5, 1.2, 1, 0.5, 0.3, 0.5, 1, 1.2, 1.5, 3, 8],
  medium: [24, 8, 3, 1.5, 0.7, 0.4, 0.2, 0.4, 0.7, 1.5, 3, 8, 24],
  high: [76, 15, 6, 2, 0.5, 0.2, 0.1, 0.2, 0.5, 2, 6, 15, 76],
};

export default function PlinkoPage() {
  const { user, refresh, pushToast, celebrate } = useUser();
  const [bet, setBet] = useState(10);
  const [risk, setRisk] = useState<Risk>("medium");
  const [dropping, setDropping] = useState(false);
  const [ballX, setBallX] = useState(50);
  const [ballRow, setBallRow] = useState(-1);
  const [landed, setLanded] = useState<{ bucket: number; multiplier: number; payout: number } | null>(null);

  if (!user) return null;

  async function drop() {
    setDropping(true);
    setLanded(null);
    setBallRow(-1);
    const res = await fetch("/api/games/plinko", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bet, risk }),
    });
    const data = await res.json();
    if (!res.ok) {
      setDropping(false);
      return pushToast("lose", data.error);
    }

    const path: number[] = data.path;
    let x = 50;
    let row = 0;
    const step = () => {
      if (row >= path.length) {
        setDropping(false);
        setLanded({ bucket: data.bucket, multiplier: data.multiplier, payout: data.payout });
        pushToast(data.payout > bet ? "win" : "lose", `${data.multiplier}x — ${data.payout > bet ? "+" : ""}$${(data.payout - bet).toLocaleString()}`);
        if (data.multiplier >= 15) celebrate();
        refresh();
        return;
      }
      const shift = (path[row] === 1 ? 1 : -1) * (50 / (ROWS + 2));
      x += shift;
      setBallX(x);
      setBallRow(row);
      row++;
      setTimeout(step, 180);
    };
    step();
  }

  const table = MULTIPLIERS[risk];

  return (
    <GameShell title="Plinko" emoji={"\u{1F3B3}"} subtitle="Drop the ball through the pegs — where it lands sets your multiplier.">
      <div className="panel p-6 flex flex-col items-center gap-4">
        <div className="relative w-full max-w-lg" style={{ height: 260 }}>
          {Array.from({ length: ROWS }).map((_, r) => (
            <div key={r} className="absolute left-0 right-0 flex justify-center gap-6" style={{ top: `${(r / ROWS) * 85}%` }}>
              {Array.from({ length: r + 2 }).map((_, c) => (
                <span
                  key={c}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-150 ${
                    ballRow === r ? "bg-[var(--gold)] scale-150" : "bg-white/30"
                  }`}
                />
              ))}
            </div>
          ))}
          {dropping || landed ? (
            <div
              className="absolute w-4 h-4 rounded-full bg-[var(--gold)] shadow-lg"
              style={{
                left: `calc(${ballX}% - 8px)`,
                top: `${((ballRow + 1) / (ROWS + 1)) * 85}%`,
                transition: "left 170ms cubic-bezier(0.5, 0, 0.5, 1.6), top 170ms cubic-bezier(0.3, 0.6, 0.4, 1)",
                boxShadow: "0 0 10px rgba(255, 213, 74, 0.8)",
              }}
            />
          ) : null}
        </div>

        <div className="grid grid-cols-[repeat(13,minmax(0,1fr))] gap-1 w-full max-w-lg text-[10px] text-center">
          {table.map((m, i) => (
            <div
              key={i}
              className={`py-1 rounded font-bold ${landed?.bucket === i ? "bg-[var(--gold)] text-black" : "bg-white/5"}`}
            >
              {m}x
            </div>
          ))}
        </div>

        {landed && (
          <div className={`font-bold value-pop ${landed.payout > bet ? "text-success" : "text-danger"}`}>
            Landed on {landed.multiplier}x &mdash; {landed.payout > bet ? "+" : ""}${(landed.payout - bet).toLocaleString()}
          </div>
        )}

        <div className="flex gap-2">
          {(["low", "medium", "high"] as Risk[]).map((r) => (
            <button key={r} className={`btn ${risk === r ? "btn-gold" : "btn-ghost"} capitalize`} disabled={dropping} onClick={() => setRisk(r)}>
              {r}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <BetInput bet={bet} setBet={setBet} max={user.money} disabled={dropping} />
          <button className="btn btn-gold" disabled={dropping || bet > user.money} onClick={drop}>
            {dropping ? "Dropping..." : "Drop Ball"}
          </button>
        </div>
      </div>
    </GameShell>
  );
}
