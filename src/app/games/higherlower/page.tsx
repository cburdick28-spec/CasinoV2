"use client";

import { useState } from "react";
import GameShell from "@/components/GameShell";
import BetInput from "@/components/BetInput";
import { useUser } from "@/lib/UserContext";

interface HLState {
  bet: number;
  pot: number;
  card: number;
  streak: number;
}

const FACE: Record<number, string> = { 1: "A", 11: "J", 12: "Q", 13: "K" };
function label(n: number) {
  return FACE[n] ?? String(n);
}

export default function HigherLowerPage() {
  const { user, refresh, pushToast } = useUser();
  const [bet, setBet] = useState(10);
  const [state, setState] = useState<HLState | null>(null);
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  async function guess(direction: "higher" | "lower") {
    setBusy(true);
    const res = await fetch("/api/games/higherlower", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "guess", guess: direction, bet: state ? undefined : bet }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return pushToast("lose", data.error);
    if (data.push) {
      setState(data.state);
      pushToast("info", "Push — cards matched.");
    } else if (data.win) {
      setState(data.state);
      pushToast("win", `Correct! Pot now $${data.state.pot.toLocaleString()}`);
    } else {
      setState(null);
      pushToast("lose", `Wrong — next card was ${label(data.nextCard)}.`);
    }
    refresh();
  }

  async function cashout() {
    setBusy(true);
    const res = await fetch("/api/games/higherlower", {
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

  const currentCard = state?.card ?? null;

  return (
    <GameShell title="Higher / Lower" emoji="\u{1F53C}" subtitle="Guess whether the next card is higher or lower. True-odds payouts, 5% house edge, cash out any time.">
      <div className="panel p-8 flex flex-col items-center gap-6">
        <div className="card-face text-3xl">{currentCard ? label(currentCard) : "?"}</div>

        {state && (
          <div className="text-lg">
            Streak <span className="text-[var(--gold)] font-bold">{state.streak}</span> &middot; Pot{" "}
            <span className="text-[var(--gold)] font-bold">${state.pot.toLocaleString()}</span>
          </div>
        )}

        <div className="flex gap-2">
          <button className="btn btn-accent" disabled={busy} onClick={() => guess("higher")}>
            {"▲"} Higher
          </button>
          <button className="btn btn-accent" disabled={busy} onClick={() => guess("lower")}>
            {"▼"} Lower
          </button>
        </div>

        {!state && <BetInput bet={bet} setBet={setBet} max={user.money} disabled={busy} />}

        {state && (
          <button className="btn btn-gold" disabled={busy} onClick={cashout}>
            Cash Out ${state.pot.toLocaleString()}
          </button>
        )}
      </div>
    </GameShell>
  );
}
