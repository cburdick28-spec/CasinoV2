"use client";

import { useState } from "react";
import GameShell from "@/components/GameShell";
import { useUser } from "@/lib/UserContext";

type BetType =
  | "straight"
  | "red"
  | "black"
  | "odd"
  | "even"
  | "low"
  | "high"
  | "dozen1"
  | "dozen2"
  | "dozen3"
  | "col1"
  | "col2"
  | "col3";

const OUTSIDE_BETS: { type: BetType; label: string; payout: string }[] = [
  { type: "red", label: "Red", payout: "1:1" },
  { type: "black", label: "Black", payout: "1:1" },
  { type: "odd", label: "Odd", payout: "1:1" },
  { type: "even", label: "Even", payout: "1:1" },
  { type: "low", label: "1-18", payout: "1:1" },
  { type: "high", label: "19-36", payout: "1:1" },
  { type: "dozen1", label: "1st 12", payout: "2:1" },
  { type: "dozen2", label: "2nd 12", payout: "2:1" },
  { type: "dozen3", label: "3rd 12", payout: "2:1" },
  { type: "col1", label: "Column 1", payout: "2:1" },
  { type: "col2", label: "Column 2", payout: "2:1" },
  { type: "col3", label: "Column 3", payout: "2:1" },
];

const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

interface BetSlip {
  type: BetType;
  amount: number;
  number?: number;
}

interface BetResult extends BetSlip {
  win: boolean;
  payout: number;
}

function numColor(n: number) {
  if (n === 0) return "green";
  return RED_NUMBERS.has(n) ? "red" : "black";
}

export default function RoulettePage() {
  const { user, refresh, pushToast } = useUser();
  const [slip, setSlip] = useState<BetSlip[]>([]);
  const [amount, setAmount] = useState(10);
  const [straightNum, setStraightNum] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState<number | null>(null);
  const [results, setResults] = useState<BetResult[] | null>(null);

  if (!user) return null;

  const total = slip.reduce((s, b) => s + b.amount, 0);

  function addBet(type: BetType, number?: number) {
    setResults(null);
    setSlip((s) => [...s, { type, amount, number }]);
  }
  function clearSlip() {
    setSlip([]);
    setResults(null);
    setSpinResult(null);
  }

  async function spin() {
    if (slip.length === 0) return;
    setSpinning(true);
    setResults(null);
    const res = await fetch("/api/games/roulette", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bets: slip }),
    });
    const data = await res.json();
    setTimeout(() => {
      setSpinning(false);
      if (!res.ok) {
        pushToast("lose", data.error);
        return;
      }
      setSpinResult(data.spin);
      setResults(data.results);
      pushToast(data.net >= 0 ? "win" : "lose", `${data.net >= 0 ? "+" : ""}$${data.net.toLocaleString()}`);
      setSlip([]);
      refresh();
    }, 1200);
  }

  return (
    <GameShell title="Roulette" emoji="\u{1F3A1}" subtitle="Build a bet slip across the board, then spin once.">
      <div className="panel p-6 flex flex-col items-center gap-4">
        <div
          className={`w-32 h-32 rounded-full border-8 flex items-center justify-center text-3xl font-extrabold transition-transform ${spinning ? "animate-spin" : ""}`}
          style={{
            borderColor: "var(--gold)",
            color: spinResult === null ? "var(--muted)" : numColor(spinResult) === "red" ? "#ff5470" : numColor(spinResult) === "green" ? "#34d399" : "white",
            background: "#0d0d1a",
          }}
        >
          {spinning ? "\u{1F3A1}" : spinResult ?? "?"}
        </div>
        {spinResult !== null && !spinning && (
          <div className="font-bold text-lg capitalize">{spinResult} &mdash; {numColor(spinResult)}</div>
        )}
      </div>

      <div className="panel p-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-muted">Bet amount</label>
          <input
            type="number"
            className="w-24"
            min={1}
            max={user.money}
            value={amount}
            onChange={(e) => setAmount(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
          />
          <input
            type="number"
            className="w-20"
            min={0}
            max={36}
            value={straightNum}
            onChange={(e) => setStraightNum(Math.max(0, Math.min(36, Math.floor(Number(e.target.value) || 0))))}
          />
          <button className="btn btn-ghost text-sm" onClick={() => addBet("straight", straightNum)} disabled={spinning}>
            Straight #{straightNum} (35:1)
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {OUTSIDE_BETS.map((b) => (
            <button key={b.type} className="btn btn-ghost text-sm flex-col !py-2" onClick={() => addBet(b.type)} disabled={spinning}>
              <span>{b.label}</span>
              <span className="text-[10px] text-muted">{b.payout}</span>
            </button>
          ))}
        </div>

        {slip.length > 0 && (
          <div className="text-sm flex flex-wrap gap-2 items-center">
            {slip.map((b, i) => (
              <span key={i} className="px-2 py-1 rounded bg-white/5 border border-[var(--border)]">
                {b.type === "straight" ? `#${b.number}` : b.type} ${b.amount}
              </span>
            ))}
            <span className="text-muted">Total: ${total.toLocaleString()}</span>
            <button className="btn btn-ghost !py-1 text-xs" onClick={clearSlip} disabled={spinning}>
              Clear
            </button>
          </div>
        )}

        <button className="btn btn-gold self-start" disabled={spinning || slip.length === 0 || total > user.money} onClick={spin}>
          {spinning ? "Spinning..." : "\u{1F3A1} Spin"}
        </button>

        {results && (
          <div className="flex flex-col gap-1 animate-in">
            {results.map((r, i) => (
              <div key={i} className={r.win ? "text-success" : "text-danger"}>
                {r.type === "straight" ? `#${r.number}` : r.type} &mdash; {r.win ? `+$${(r.payout - r.amount).toLocaleString()}` : `-$${r.amount.toLocaleString()}`}
              </div>
            ))}
          </div>
        )}
      </div>
    </GameShell>
  );
}
