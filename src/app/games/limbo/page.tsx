"use client";

import { useState } from "react";
import GameShell from "@/components/GameShell";
import BetInput from "@/components/BetInput";
import { useUser } from "@/lib/UserContext";
import { MAX_TARGET, MIN_TARGET } from "@/lib/games/limbo";

const PRESET_TARGETS = [1.5, 2, 5, 10, 50, 100];

export default function LimboPage() {
  const { user, refresh, pushToast, celebrate } = useUser();
  const [bet, setBet] = useState(10);
  const [target, setTarget] = useState(2);
  const [running, setRunning] = useState(false);
  const [display, setDisplay] = useState(1);
  const [result, setResult] = useState<{ roll: number; won: boolean; payout: number } | null>(null);
  const [shake, setShake] = useState(false);

  if (!user) return null;

  const winChance = Math.min(100, (0.97 / target) * 100);

  async function play() {
    setRunning(true);
    setResult(null);

    const res = await fetch("/api/games/limbo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bet, target }),
    });
    const data = await res.json();
    if (!res.ok) {
      setRunning(false);
      return pushToast("lose", data.error);
    }

    // Animate a quick climb from 1.00x up to the rolled result.
    const duration = 900;
    const start = performance.now();
    const finalRoll = data.roll;
    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 2);
      setDisplay(1 + (finalRoll - 1) * eased);
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        setDisplay(finalRoll);
        setRunning(false);
        setResult({ roll: finalRoll, won: data.won, payout: data.payout });
        const net = data.payout - bet;
        if (data.won) {
          pushToast("win", `Hit ${finalRoll.toFixed(2)}x — +$${net.toLocaleString()}`);
          if (target >= 10) celebrate();
        } else {
          pushToast("lose", `Only ${finalRoll.toFixed(2)}x — -$${bet.toLocaleString()}`);
          setShake(true);
          setTimeout(() => setShake(false), 550);
        }
        refresh();
      }
    }
    requestAnimationFrame(tick);
  }

  return (
    <GameShell title="Limbo" emoji={"\u{1F4C9}"} subtitle="Set a target multiplier — clear it on the roll and you win, fall short and you lose.">
      <div className={`panel p-10 flex flex-col items-center gap-6 ${shake ? "shake" : ""}`}>
        <div
          className="text-6xl font-black tabular-nums"
          style={{
            color: result ? (result.won ? "var(--success)" : "var(--danger)") : "var(--gold)",
          }}
        >
          {display.toFixed(2)}x
        </div>
        {result && (
          <div className={`font-bold value-pop ${result.won ? "text-success" : "text-danger"}`}>
            {result.won ? `\u{1F389} Target hit! +$${(result.payout - bet).toLocaleString()}` : `Fell short — -$${bet.toLocaleString()}`}
          </div>
        )}

        <div className="flex flex-col items-center gap-2 w-full max-w-sm">
          <label className="text-sm text-muted">Target multiplier</label>
          <input
            type="number"
            step={0.01}
            min={MIN_TARGET}
            max={MAX_TARGET}
            value={target}
            disabled={running}
            onChange={(e) => setTarget(Math.max(MIN_TARGET, Math.min(MAX_TARGET, Number(e.target.value) || MIN_TARGET)))}
            className="w-full text-center text-lg"
          />
          <div className="flex flex-wrap gap-2 justify-center">
            {PRESET_TARGETS.map((t) => (
              <button
                key={t}
                className={`btn !py-1 !px-3 text-sm ${target === t ? "btn-gold" : "btn-ghost"}`}
                disabled={running}
                onClick={() => setTarget(t)}
              >
                {t}x
              </button>
            ))}
          </div>
          <div className="text-xs text-muted">Win chance: ~{winChance.toFixed(2)}%</div>
        </div>

        <div className="flex items-center gap-3">
          <BetInput bet={bet} setBet={setBet} max={user.money} disabled={running} />
          <button className="btn btn-gold text-lg px-8" disabled={running || bet > user.money} onClick={play}>
            {running ? "Rolling..." : "Play"}
          </button>
        </div>
      </div>
    </GameShell>
  );
}
