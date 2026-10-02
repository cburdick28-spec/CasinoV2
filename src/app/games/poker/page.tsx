"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import GameShell from "@/components/GameShell";
import BetInput from "@/components/BetInput";
import Scene3DBase from "@/components/three/Scene3DBase";
import { useUser } from "@/lib/UserContext";
import type { Card } from "@/lib/types";

// Three.js touches the WebGL canvas directly, so it can only run in the browser.
const PokerScene3D = dynamic(() => import("@/components/three/PokerScene3D"), {
  ssr: false,
  loading: () => null,
});

interface StateView {
  player: Card[];
  dealer: (Card | null)[];
  community: Card[];
  pot: number;
  bet: number;
  stage: "preflop" | "flop" | "turn" | "river" | "result";
}

interface ResultView {
  outcome: "win" | "lose" | "chop";
  net: number;
  playerHand: string;
  dealerHand: string;
}

const STAGE_LABEL: Record<string, string> = {
  preflop: "Pre-Flop",
  flop: "Flop",
  turn: "Turn",
  river: "River",
  result: "Showdown",
};

export default function PokerPage() {
  const { user, refresh, pushToast, celebrate } = useUser();
  const [ante, setAnte] = useState(10);
  const [raiseAmt, setRaiseAmt] = useState(5);
  const [state, setState] = useState<StateView | null>(null);
  const [result, setResult] = useState<ResultView | null>(null);
  const [busy, setBusy] = useState(false);
  const [dealSeq, setDealSeq] = useState(0);

  if (!user) return null;

  async function act(body: Record<string, unknown>) {
    setBusy(true);
    const res = await fetch("/api/games/poker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      pushToast("lose", data.error);
      return;
    }
    if (data.folded) {
      setState(null);
      setResult(null);
      pushToast("lose", `Folded -$${data.net.toLocaleString()}`);
      refresh();
      return;
    }
    setState(data.state);
    if (data.result) {
      setResult(data.result);
      pushToast(data.result.outcome === "win" ? "win" : data.result.outcome === "lose" ? "lose" : "info", `${data.result.outcome.toUpperCase()} ${data.result.net ? `$${Math.abs(data.result.net).toLocaleString()}` : ""}`);
      if (data.result.outcome === "win" && data.result.playerHand === "Royal Flush") celebrate();
    } else {
      setResult(null);
    }
    refresh();
  }

  function deal() {
    setResult(null);
    setDealSeq((n) => n + 1);
    act({ action: "deal", bet: ante });
  }

  return (
    <GameShell title="Texas Hold'em" emoji="♠️" subtitle="Best 5-card hand from your 2 hole cards + 5 community cards, vs the dealer.">
      <div className="panel p-6 flex flex-col gap-6">
        {!state && (
          <div className="flex flex-wrap items-center gap-3">
            <BetInput bet={ante} setBet={setAnte} max={user.money} disabled={busy} />
            <button className="btn btn-gold" disabled={busy || ante > user.money} onClick={deal}>
              Deal
            </button>
          </div>
        )}

        {state && (
          <>
            <div className="text-sm text-muted">{STAGE_LABEL[state.stage]} &middot; Pot ${state.pot.toLocaleString()}</div>

            <Scene3DBase height={320} key={dealSeq}>
              <PokerScene3D playerCards={state.player} dealerCards={state.dealer} community={state.community} />
            </Scene3DBase>

            {result && (
              <div className={`font-bold animate-in ${result.outcome === "win" ? "text-success" : result.outcome === "lose" ? "text-danger" : "text-muted"}`}>
                {result.outcome === "win" && `\u{1F3C6} You win! ${result.playerHand} beats ${result.dealerHand} (+$${result.net.toLocaleString()})`}
                {result.outcome === "lose" && `Dealer wins with ${result.dealerHand} over your ${result.playerHand} (-$${result.net.toLocaleString()})`}
                {result.outcome === "chop" && `Chop! Both have ${result.playerHand} — bet returned`}
              </div>
            )}

            {state.stage !== "result" && (
              <div className="flex flex-wrap items-center gap-2">
                <button className="btn btn-ghost" disabled={busy} onClick={() => act({ action: "check" })}>
                  {state.stage === "river" ? "Check (Showdown)" : "Check"}
                </button>
                <input
                  type="number"
                  className="w-24"
                  min={1}
                  max={user.money}
                  value={raiseAmt}
                  onChange={(e) => setRaiseAmt(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                />
                <button className="btn btn-accent" disabled={busy || raiseAmt > user.money} onClick={() => act({ action: "raise", amount: raiseAmt })}>
                  Raise
                </button>
                <button className="btn btn-danger" disabled={busy} onClick={() => act({ action: "fold" })}>
                  Fold
                </button>
              </div>
            )}

            {state.stage === "result" && (
              <button className="btn btn-gold self-start" onClick={() => setState(null)}>
                Play Again
              </button>
            )}
          </>
        )}
      </div>
    </GameShell>
  );
}
