"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import GameShell from "@/components/GameShell";
import BetInput from "@/components/BetInput";
import Scene3DBase from "@/components/three/Scene3DBase";
import { useUser } from "@/lib/UserContext";
import type { Card } from "@/lib/types";

// Three.js touches the WebGL canvas directly, so it can only run in the browser.
const VideoPokerScene3D = dynamic(() => import("@/components/three/VideoPokerScene3D"), {
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

const SUIT_SYMBOL: Record<string, string> = { S: "♠", H: "♥", D: "♦", C: "♣" };

const PAYTABLE: { name: string; mult: string }[] = [
  { name: "Royal Flush", mult: "250x" },
  { name: "Straight Flush", mult: "50x" },
  { name: "Four of a Kind", mult: "25x" },
  { name: "Full House", mult: "9x" },
  { name: "Flush", mult: "6x" },
  { name: "Straight", mult: "4x" },
  { name: "Three of a Kind", mult: "3x" },
  { name: "Two Pair", mult: "2x" },
  { name: "Jacks or Better", mult: "1x" },
];

export default function VideoPokerPage() {
  const { user, refresh, pushToast, celebrate } = useUser();
  const [bet, setBet] = useState(10);
  const [hand, setHand] = useState<Card[] | null>(null);
  const [holds, setHolds] = useState<boolean[]>([false, false, false, false, false]);
  const [stage, setStage] = useState<"bet" | "held" | "result">("bet");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ handName: string; mult: number; payout: number } | null>(null);
  const [dealSeq, setDealSeq] = useState(0);

  if (!user) return null;

  async function deal() {
    setBusy(true);
    setResult(null);
    const res = await fetch("/api/games/videopoker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deal", bet }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return pushToast("lose", data.error);
    setHand(data.hand);
    setHolds([false, false, false, false, false]);
    setStage("held");
    setDealSeq((n) => n + 1);
    refresh();
  }

  function toggleHold(i: number) {
    if (stage !== "held" || busy) return;
    setHolds((h) => h.map((v, idx) => (idx === i ? !v : v)));
  }

  async function draw() {
    setBusy(true);
    const res = await fetch("/api/games/videopoker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "draw", holds }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return pushToast("lose", data.error);
    setHand(data.hand);
    setStage("result");
    setResult({ handName: data.handName, mult: data.mult, payout: data.payout });
    const net = data.payout - bet;
    if (data.won) {
      pushToast("win", `${data.handName}! +$${net.toLocaleString()}`);
      if (data.mult >= 9) celebrate();
    } else {
      pushToast("lose", `${data.handName} — -$${bet.toLocaleString()}`);
    }
    refresh();
  }

  function playAgain() {
    setHand(null);
    setResult(null);
    setHolds([false, false, false, false, false]);
    setStage("bet");
  }

  return (
    <GameShell title="Video Poker" emoji={"\u{1F0CF}"} subtitle="Jacks or Better, 9/6 paytable. Hold the cards you want, draw the rest once.">
      <div className="panel p-6 flex flex-col items-center gap-6">
        <Scene3DBase height={320} key={dealSeq}>
          <VideoPokerScene3D hand={hand ?? Array(5).fill(null)} holds={holds} />
        </Scene3DBase>

        <div className="flex gap-3 flex-wrap justify-center">
          {(hand ?? Array(5).fill(null)).map((c, i) => {
            const held = holds[i];
            return (
              <button
                key={i}
                onClick={() => toggleHold(i)}
                disabled={stage !== "held"}
                className="relative flex flex-col items-center gap-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-white/5 disabled:opacity-60"
              >
                <span className="text-xs text-muted">
                  {c ? `${c.rank}${SUIT_SYMBOL[c.suit]}` : `Card ${i + 1}`}
                </span>
                <span className={`text-[10px] font-bold ${held ? "text-[var(--gold)]" : "text-transparent"}`}>HELD</span>
              </button>
            );
          })}
        </div>

        {result && (
          <div className={`font-bold text-lg value-pop ${result.mult > 0 ? "text-success" : "text-danger"}`}>
            {result.handName} {result.mult > 0 ? `— ${result.mult}x (+$${(result.payout - bet).toLocaleString()})` : `— -$${bet.toLocaleString()}`}
          </div>
        )}

        {stage === "bet" && (
          <div className="flex items-center gap-3">
            <BetInput bet={bet} setBet={setBet} max={user.money} disabled={busy} />
            <button className="btn btn-gold" disabled={busy || bet > user.money} onClick={deal}>
              Deal
            </button>
          </div>
        )}

        {stage === "held" && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs text-muted">Click cards to hold them, then draw.</p>
            <button className="btn btn-gold" disabled={busy} onClick={draw}>
              {busy ? "Drawing..." : "Draw"}
            </button>
          </div>
        )}

        {stage === "result" && (
          <button className="btn btn-gold" onClick={playAgain}>
            Deal Again
          </button>
        )}
      </div>

      <div className="panel p-5">
        <h3 className="font-bold mb-3">Paytable (9/6 Jacks or Better)</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
          {PAYTABLE.map((p) => (
            <div key={p.name} className="flex justify-between gap-2 px-2 py-1 rounded bg-white/5">
              <span>{p.name}</span>
              <span className="text-[var(--gold)] font-bold">{p.mult}</span>
            </div>
          ))}
        </div>
      </div>
    </GameShell>
  );
}
