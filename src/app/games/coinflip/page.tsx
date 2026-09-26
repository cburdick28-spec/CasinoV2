"use client";

import { useState } from "react";
import GameShell from "@/components/GameShell";
import BetInput from "@/components/BetInput";
import { useUser } from "@/lib/UserContext";

interface CoinState {
  bet: number;
  pot: number;
  streak: number;
}

export default function CoinFlipPage() {
  const { user, refresh, pushToast } = useUser();
  const [bet, setBet] = useState(10);
  const [side, setSide] = useState<"heads" | "tails">("heads");
  const [state, setState] = useState<CoinState | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  async function flip() {
    setBusy(true);
    const res = await fetch("/api/games/coinflip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "flip", side, bet: state ? undefined : bet }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return pushToast("lose", data.error);
    setLastResult(data.result);
    if (data.win) {
      setState(data.state);
      pushToast("win", `${data.result}! Streak ${data.state.streak} — pot $${data.state.pot.toLocaleString()}`);
    } else {
      setState(null);
      pushToast("lose", `${data.result}! Lost $${(state?.bet ?? bet).toLocaleString()}`);
    }
    refresh();
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
    <GameShell title="Coin Flip" emoji="\u{1FA99}" subtitle="Call it right and keep the streak going — each win multiplies your pot by 1.95x. Cash out any time.">
      <div className="panel p-8 flex flex-col items-center gap-6">
        <div className="text-7xl">{lastResult === "heads" ? "\u{1FA99}" : lastResult === "tails" ? "\u{1FA99}" : "❓"}</div>
        {lastResult && <div className="font-bold">Last flip: {lastResult}</div>}

        {state ? (
          <div className="flex flex-col items-center gap-3">
            <div className="text-lg">
              Streak <span className="text-[var(--gold)] font-bold">{state.streak}</span> &middot; Pot{" "}
              <span className="text-[var(--gold)] font-bold">${state.pot.toLocaleString()}</span>
            </div>
            <div className="flex gap-2">
              <button className={`btn ${side === "heads" ? "btn-gold" : "btn-ghost"}`} onClick={() => setSide("heads")}>
                Heads
              </button>
              <button className={`btn ${side === "tails" ? "btn-gold" : "btn-ghost"}`} onClick={() => setSide("tails")}>
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
              <button className={`btn ${side === "heads" ? "btn-gold" : "btn-ghost"}`} onClick={() => setSide("heads")}>
                Heads
              </button>
              <button className={`btn ${side === "tails" ? "btn-gold" : "btn-ghost"}`} onClick={() => setSide("tails")}>
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
