"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import GameShell from "@/components/GameShell";
import BetInput from "@/components/BetInput";
import Scene3DBase from "@/components/three/Scene3DBase";
import { useUser } from "@/lib/UserContext";
import type { Card } from "@/lib/types";

// Three.js touches the WebGL canvas directly, so it can only run in the browser.
const WarScene3D = dynamic(() => import("@/components/three/WarScene3D"), {
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

export default function WarPage() {
  const { user, refresh, pushToast, celebrate } = useUser();
  const [bet, setBet] = useState(10);
  const [busy, setBusy] = useState(false);
  const [playerCard, setPlayerCard] = useState<Card | null>(null);
  const [dealerCard, setDealerCard] = useState<Card | null>(null);
  const [warPlayerCard, setWarPlayerCard] = useState<Card | null>(null);
  const [warDealerCard, setWarDealerCard] = useState<Card | null>(null);
  const [tied, setTied] = useState(false);
  const [pendingBet, setPendingBet] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [dealSeq, setDealSeq] = useState(0);

  if (!user) return null;

  async function draw() {
    setBusy(true);
    setMessage(null);
    setTied(false);
    setWarPlayerCard(null);
    setWarDealerCard(null);
    const res = await fetch("/api/games/war", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "draw", bet }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return pushToast("lose", data.error);
    setPlayerCard(data.playerCard);
    setDealerCard(data.dealerCard);
    setDealSeq((n) => n + 1);

    if (data.result === "tie") {
      setTied(true);
      setPendingBet(bet);
      pushToast("info", "Tie! Surrender for half back, or go to war.");
      return;
    }

    finish(data.result, data.payout, bet);
  }

  function finish(result: "win" | "lose", payout: number, staked: number) {
    const net = payout - staked;
    if (result === "win") {
      pushToast("win", `You win! +$${net.toLocaleString()}`);
      setMessage(`\u{2694}\u{FE0F} You win! +$${net.toLocaleString()}`);
      if (staked >= bet * 2) celebrate();
    } else {
      pushToast("lose", `Dealer wins. -$${staked.toLocaleString()}`);
      setMessage(`Dealer wins. -$${staked.toLocaleString()}`);
      setShake(true);
      setTimeout(() => setShake(false), 550);
    }
    refresh();
  }

  async function surrender() {
    setBusy(true);
    const res = await fetch("/api/games/war", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "surrender" }),
    });
    const data = await res.json();
    setBusy(false);
    setTied(false);
    if (!res.ok) return pushToast("lose", data.error);
    pushToast("info", `Surrendered — kept $${data.payout.toLocaleString()}`);
    setMessage(`Surrendered — kept $${data.payout.toLocaleString()} of your $${pendingBet.toLocaleString()} bet`);
    refresh();
  }

  async function goToWar() {
    setBusy(true);
    const res = await fetch("/api/games/war", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "war" }),
    });
    const data = await res.json();
    setBusy(false);
    setTied(false);
    if (!res.ok) return pushToast("lose", data.error);
    // Keep the original tied cards in place and deal the war round's fresh
    // cards further forward, so both pairs stay visible on the table.
    setWarPlayerCard(data.playerCard);
    setWarDealerCard(data.dealerCard);
    finish(data.result, data.payout, pendingBet * 2);
  }

  return (
    <GameShell title="Casino War" emoji={"\u{2694}\u{FE0F}"} subtitle="Highest card wins. Tie? Surrender for half back, or double down and go to war.">
      <div className={`panel p-8 flex flex-col items-center gap-6 ${shake ? "shake" : ""}`}>
        <Scene3DBase height={320} key={dealSeq}>
          <WarScene3D
            playerCard={playerCard}
            dealerCard={dealerCard}
            warPlayerCard={warPlayerCard}
            warDealerCard={warDealerCard}
            tied={tied}
          />
        </Scene3DBase>

        {message && <div className="font-bold text-lg value-pop">{message}</div>}

        {tied ? (
          <div className="flex flex-col items-center gap-3">
            <div className="text-lg font-bold text-[var(--gold)]">War! Matching cards.</div>
            <div className="flex gap-2">
              <button className="btn btn-ghost" disabled={busy} onClick={surrender}>
                Surrender (keep ${Math.floor(pendingBet / 2).toLocaleString()})
              </button>
              <button className="btn btn-gold" disabled={busy || pendingBet > user.money} onClick={goToWar}>
                Go To War (+${pendingBet.toLocaleString()})
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <BetInput bet={bet} setBet={setBet} max={user.money} disabled={busy} />
            <button className="btn btn-gold" disabled={busy || bet > user.money} onClick={draw}>
              {busy ? "Drawing..." : "Draw"}
            </button>
          </div>
        )}
      </div>

      <div className="panel p-5 text-sm text-muted">
        <p>One card each — higher rank wins 1:1 (Ace is high). On a tie you can surrender for half your bet back, or match your bet and go to war: draw again, and a second tie always goes your way.</p>
      </div>
    </GameShell>
  );
}
