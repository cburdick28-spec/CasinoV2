"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import GameShell from "@/components/GameShell";
import BetInput from "@/components/BetInput";
import Scene3DBase from "@/components/three/Scene3DBase";
import { useUser } from "@/lib/UserContext";
import type { Card } from "@/lib/types";

// Three.js touches the WebGL canvas directly, so it can only run in the browser.
const BaccaratScene3D = dynamic(() => import("@/components/three/BaccaratScene3D"), {
  ssr: false,
  loading: () => null,
});

type Side = "player" | "banker" | "tie";

interface RoundResult {
  player: Card[];
  banker: Card[];
  playerTotal: number;
  bankerTotal: number;
  winner: Side;
  payout: number;
}

export default function BaccaratPage() {
  const { user, refresh, pushToast, celebrate } = useUser();
  const [bet, setBet] = useState(10);
  const [side, setSide] = useState<Side>("player");
  const [busy, setBusy] = useState(false);
  const [round, setRound] = useState<RoundResult | null>(null);
  const [dealSeq, setDealSeq] = useState(0);

  if (!user) return null;

  async function play() {
    setBusy(true);
    const res = await fetch("/api/games/baccarat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bet, side }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return pushToast("lose", data.error);
    setRound(data);
    setDealSeq((n) => n + 1);
    const net = data.payout - bet;
    pushToast(net > 0 ? "win" : net === 0 ? "info" : "lose", `${data.winner.toUpperCase()} wins — ${net >= 0 ? "+" : ""}$${net.toLocaleString()}`);
    if (net >= bet * 4) celebrate();
    refresh();
  }

  return (
    <GameShell title="Baccarat" emoji={"\u{1F3B4}"} subtitle="Punto Banco — bet on Player, Banker, or Tie. Cards deal and draw automatically by house rules.">
      <div className="panel p-6 flex flex-col gap-6">
        {round && (
          <>
            <Scene3DBase height={320} key={dealSeq}>
              <BaccaratScene3D playerCards={round.player} bankerCards={round.banker} />
            </Scene3DBase>
            <div className="flex gap-6">
              <h3 className="text-sm text-muted">Player ({round.playerTotal})</h3>
              <h3 className="text-sm text-muted">Banker ({round.bankerTotal})</h3>
            </div>
            <div className={`font-bold animate-in ${round.payout > bet ? "text-success" : round.payout === bet ? "text-muted" : "text-danger"}`}>
              {round.winner.toUpperCase()} wins &mdash; {round.payout > bet ? `+$${(round.payout - bet).toLocaleString()}` : round.payout === bet ? "Push" : `-$${bet.toLocaleString()}`}
            </div>
          </>
        )}

        <div className="flex gap-2">
          {(["player", "banker", "tie"] as Side[]).map((s) => (
            <button key={s} className={`btn capitalize ${side === s ? "btn-gold" : "btn-ghost"}`} disabled={busy} onClick={() => setSide(s)}>
              {s} {s === "player" ? "(2:1)" : s === "banker" ? "(1.95:1)" : "(9:1)"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <BetInput bet={bet} setBet={setBet} max={user.money} disabled={busy} />
          <button className="btn btn-gold" disabled={busy || bet > user.money} onClick={play}>
            {busy ? "Dealing..." : "Deal"}
          </button>
        </div>
      </div>
    </GameShell>
  );
}
