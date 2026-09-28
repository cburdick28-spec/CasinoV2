"use client";

import { useState } from "react";
import GameShell from "@/components/GameShell";
import BetInput from "@/components/BetInput";
import { useUser } from "@/lib/UserContext";

interface CrapsState {
  phase: "come_out" | "point";
  point: number | null;
  bet: number;
  oddsBet: number;
}

const DICE_FACES = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

export default function CrapsPage() {
  const { user, refresh, pushToast } = useUser();
  const [bet, setBet] = useState(10);
  const [oddsAmt, setOddsAmt] = useState(10);
  const [state, setState] = useState<CrapsState | null>(null);
  const [dice, setDice] = useState<[number, number] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [rolling, setRolling] = useState(false);
  const [outcome, setOutcome] = useState<"win" | "lose" | "continue" | null>(null);

  if (!user) return null;

  async function roll(initialBet?: number) {
    setRolling(true);
    setMessage(null);
    setOutcome(null);
    const res = await fetch("/api/games/craps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "roll", bet: initialBet }),
    });
    const data = await res.json();
    setTimeout(() => {
      setRolling(false);
      if (!res.ok) {
        pushToast("lose", data.error);
        return;
      }
      setDice(data.dice);
      setState(data.state);
      setMessage(data.message);
      setOutcome(data.outcome);
      if (data.outcome !== "continue") {
        pushToast(data.outcome === "win" ? "win" : "lose", data.message);
      }
      refresh();
    }, 500);
  }

  async function addOdds() {
    const res = await fetch("/api/games/craps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add_odds", amount: oddsAmt }),
    });
    const data = await res.json();
    if (!res.ok) return pushToast("lose", data.error);
    setState(data.state);
    refresh();
  }

  return (
    <GameShell title="Craps" emoji={"\u{1F3B2}"} subtitle="Classic pass-line craps. Back your point with an odds bet for a house-edge-free boost.">
      <div className="panel p-6 flex flex-col items-center gap-5">
        <div className={`flex gap-4 text-7xl h-24 items-center ${outcome === "lose" ? "shake" : ""}`}>
          {dice ? (
            <>
              <span className={rolling ? "dice-tumble" : "value-pop"} style={{ animationDelay: "0ms" }}>
                {DICE_FACES[dice[0]]}
              </span>
              <span className={rolling ? "dice-tumble" : "value-pop"} style={{ animationDelay: "80ms" }}>
                {DICE_FACES[dice[1]]}
              </span>
            </>
          ) : (
            <span className="text-muted text-2xl">Roll to begin</span>
          )}
        </div>

        {message && <div className="font-semibold animate-in">{message}</div>}

        {state ? (
          <div className="flex flex-col items-center gap-3">
            <div className="text-sm text-muted">
              Point: <span className="text-[var(--gold)] font-bold">{state.point}</span> &middot; Bet ${state.bet.toLocaleString()}
              {state.oddsBet > 0 && ` + $${state.oddsBet.toLocaleString()} odds`}
            </div>
            <div className="flex gap-2 items-center">
              <input type="number" className="w-24" min={1} max={user.money} value={oddsAmt} onChange={(e) => setOddsAmt(Math.max(1, Math.floor(Number(e.target.value) || 1)))} />
              <button className="btn btn-ghost text-sm" disabled={rolling || oddsAmt > user.money} onClick={addOdds}>
                Add Odds
              </button>
            </div>
            <button className="btn btn-gold" disabled={rolling} onClick={() => roll()}>
              {rolling ? "Rolling..." : "\u{1F3B2} Roll"}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <BetInput bet={bet} setBet={setBet} max={user.money} disabled={rolling} />
            <button className="btn btn-gold" disabled={rolling || bet > user.money} onClick={() => roll(bet)}>
              {rolling ? "Rolling..." : "\u{1F3B2} Come Out Roll"}
            </button>
          </div>
        )}
      </div>

      <div className="panel p-5 text-sm text-muted">
        <p><b className="text-foreground">Come out roll:</b> 7 or 11 wins instantly, 2/3/12 loses instantly, anything else sets your point.</p>
        <p className="mt-1"><b className="text-foreground">Point phase:</b> roll your point again to win, roll a 7 and you lose (&quot;seven out&quot;). Add an odds bet any time for a true-odds payout with no house edge.</p>
      </div>
    </GameShell>
  );
}
