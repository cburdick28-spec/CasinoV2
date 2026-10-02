"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import GameShell from "@/components/GameShell";
import BetInput from "@/components/BetInput";
import Scene3DBase from "@/components/three/Scene3DBase";
import { useUser } from "@/lib/UserContext";
import type { Card, Suit } from "@/lib/types";

// Three.js touches the WebGL canvas directly, so it can only run in the browser.
const HigherLowerScene3D = dynamic(() => import("@/components/three/HigherLowerScene3D"), {
  ssr: false,
  loading: () => (
    <div
      className="w-full rounded-2xl border border-[var(--border)] flex items-center justify-center text-muted"
      style={{ height: 320 }}
    >
      Loading table...
    </div>
  ),
});

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

// The server only tracks each card's rank (1-13), not a suit, so for the 3D
// scene we derive a stable, purely decorative suit from the rank value.
const SUITS: Suit[] = ["S", "H", "D", "C"];
function toCard(n: number | null): Card | null {
  if (n === null) return null;
  const rank = FACE[n] ?? String(n);
  return { rank: rank as Card["rank"], suit: SUITS[n % SUITS.length] };
}

export default function HigherLowerPage() {
  const { user, refresh, pushToast, celebrate } = useUser();
  const [bet, setBet] = useState(10);
  const [state, setState] = useState<HLState | null>(null);
  const [busy, setBusy] = useState(false);
  const [flip, setFlip] = useState(0);
  const [wrong, setWrong] = useState(false);
  // The card shown on the left of the 3D table (the one being guessed
  // against) and the freshly revealed card dealt in beside it.
  const [prevCard, setPrevCard] = useState<number | null>(null);
  const [revealCard, setRevealCard] = useState<number | null>(null);

  if (!user) return null;

  async function guess(direction: "higher" | "lower") {
    const beforeCard = state?.card ?? null;
    setBusy(true);
    setWrong(false);
    const res = await fetch("/api/games/higherlower", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "guess", guess: direction, bet: state ? undefined : bet }),
    });
    const data = await res.json();
    setBusy(false);
    setFlip((n) => n + 1);
    if (!res.ok) return pushToast("lose", data.error);
    setPrevCard(beforeCard);
    setRevealCard(data.nextCard ?? null);
    if (data.push) {
      setState(data.state);
      pushToast("info", "Push — cards matched.");
    } else if (data.win) {
      setState(data.state);
      pushToast("win", `Correct! Pot now $${data.state.pot.toLocaleString()}`);
      if (data.state.streak >= 5) celebrate();
    } else {
      setState(null);
      setWrong(true);
      pushToast("lose", `Wrong — next card was ${label(data.nextCard)}.`);
      setTimeout(() => setWrong(false), 550);
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
    setPrevCard(null);
    setRevealCard(null);
    refresh();
  }

  const currentCard = state?.card ?? null;

  return (
    <GameShell title="Higher / Lower" emoji={"\u{1F53C}"} subtitle="Guess whether the next card is higher or lower. True-odds payouts, 5% house edge, cash out any time.">
      <div className={`panel p-8 flex flex-col items-center gap-6 ${wrong ? "shake" : ""}`}>
        <Scene3DBase height={320} key={flip}>
          <HigherLowerScene3D currentCard={toCard(prevCard ?? currentCard)} nextCard={toCard(revealCard)} />
        </Scene3DBase>

        {state && (
          <div className="text-lg">
            Streak <span className="text-[var(--gold)] font-bold count-up">{state.streak}</span> &middot; Pot{" "}
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
