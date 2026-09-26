"use client";

import { useState } from "react";
import GameShell from "@/components/GameShell";
import BetInput from "@/components/BetInput";
import { CardRow } from "@/components/PlayingCard";
import { useUser } from "@/lib/UserContext";
import type { Card } from "@/lib/types";

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
  const { user, refresh, pushToast } = useUser();
  const [bet, setBet] = useState(10);
  const [side, setSide] = useState<Side>("player");
  const [busy, setBusy] = useState(false);
  const [round, setRound] = useState<RoundResult | null>(null);

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
    const net = data.payout - bet;
    pushToast(net > 0 ? "win" : net === 0 ? "info" : "lose", `${data.winner.toUpperCase()} wins — ${net >= 0 ? "+" : ""}$${net.toLocaleString()}`);
    refresh();
  }

  return (
    <GameShell title="Baccarat" emoji="\u{1F3B4}" subtitle="Punto Banco — bet on Player, Banker, or Tie. Cards deal and draw automatically by house rules.">
      <div className="panel p-6 flex flex-col gap-6">
        {round && (
          <>
            <div>
              <h3 className="text-sm text-muted mb-2">Player ({round.playerTotal})</h3>
              <CardRow cards={round.player} />
            </div>
            <div>
              <h3 className="text-sm text-muted mb-2">Banker ({round.bankerTotal})</h3>
              <CardRow cards={round.banker} />
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
