"use client";

import { useEffect, useState } from "react";
import GameShell from "@/components/GameShell";
import BetInput from "@/components/BetInput";
import { CardRow } from "@/components/PlayingCard";
import { useUser } from "@/lib/UserContext";
import type { Card } from "@/lib/types";

interface HandView {
  cards: Card[];
  bet: number;
  finished: boolean;
  doubled: boolean;
  natural: boolean;
  surrendered: boolean;
  value: number;
}

interface StateView {
  dealer: (Card | null)[];
  dealerValue: number | null;
  dealerHidden: boolean;
  hands: HandView[];
  current: number;
  active: boolean;
  insuranceOffered: boolean;
}

export default function BlackjackPage() {
  const { user, refresh, pushToast, celebrate } = useUser();
  const [bet, setBet] = useState(10);
  const [state, setState] = useState<StateView | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [dealSeq, setDealSeq] = useState(0);

  useEffect(() => {
    fetch("/api/games/blackjack")
      .then((r) => r.json())
      .then((d) => d.state && setState(d.state));
  }, []);

  async function act(body: Record<string, unknown>) {
    setBusy(true);
    const res = await fetch("/api/games/blackjack", {
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
    if (body.action === "deal") setDealSeq((n) => n + 1);
    setState(data.state);
    if (data.messages?.length) {
      setMessages(data.messages);
      const anyWin = data.messages.some((m: string) => m.includes("+$"));
      pushToast(anyWin ? "win" : "lose", data.messages.join(" "));
      if (data.messages.some((m: string) => m.includes("Blackjack!"))) celebrate();
    } else {
      setMessages([]);
    }
    refresh();
  }

  if (!user) return null;

  const hand = state?.hands[state.current];
  const canAct = state?.active && hand && !hand.finished;
  const canDouble = canAct && hand!.cards.length === 2 && !hand!.doubled && hand!.bet <= user.money;
  const canSplit =
    canAct &&
    hand!.cards.length === 2 &&
    hand!.cards[0].rank === hand!.cards[1].rank &&
    hand!.bet <= user.money &&
    (state?.hands.length ?? 0) < 4;
  const canSurrender = canAct && hand!.cards.length === 2 && state!.hands.length === 1;

  return (
    <GameShell title="Blackjack" emoji={"\u{1F0CF}"} subtitle="Dealer stands on 17. Blackjack pays 3:2.">
      <div className="panel p-6 flex flex-col gap-6">
        {!state?.active && (
          <div className="flex flex-wrap items-center gap-3">
            <BetInput bet={bet} setBet={setBet} max={user.money} disabled={busy} />
            <button className="btn btn-gold" disabled={busy || bet > user.money} onClick={() => act({ action: "deal", bet })}>
              Deal
            </button>
          </div>
        )}

        {messages.length > 0 && (
          <div className="flex flex-col gap-1 animate-in">
            {messages.map((m, i) => (
              <div key={i} className={`font-semibold ${m.includes("+$") ? "text-success" : m.includes("Push") ? "text-muted" : "text-danger"}`}>
                {m}
              </div>
            ))}
          </div>
        )}

        {state && (
          <>
            <div>
              <h3 className="text-sm text-muted mb-2">
                Dealer {state.dealerValue !== null ? `(${state.dealerValue})` : ""}
              </h3>
              <CardRow cards={state.dealer.length ? state.dealer : [null]} dealKey={`dealer-${dealSeq}`} />
            </div>

            <div className="flex flex-col gap-4">
              {state.hands.map((h, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border ${idx === state.current && state.active && !h.finished ? "border-[var(--gold)]" : "border-[var(--border)]"}`}
                >
                  <h3 className="text-sm text-muted mb-2">
                    Hand {idx + 1} ({h.value}) &middot; Bet ${h.bet.toLocaleString()}
                    {h.natural && " • Blackjack!"}
                    {h.surrendered && " • Surrendered"}
                  </h3>
                  <CardRow cards={h.cards} dealKey={`hand-${idx}-${dealSeq}`} />
                </div>
              ))}
            </div>

            {state.insuranceOffered && (
              <div className="panel p-4 flex items-center gap-3 border-[var(--gold)]">
                <span>Dealer shows an Ace. Buy insurance?</span>
                <button className="btn btn-accent !py-1 text-sm" disabled={busy} onClick={() => act({ action: "insurance", take: true })}>
                  Yes
                </button>
                <button className="btn btn-ghost !py-1 text-sm" disabled={busy} onClick={() => act({ action: "insurance", take: false })}>
                  No
                </button>
              </div>
            )}

            {state.active && !state.insuranceOffered && (
              <div className="flex flex-wrap gap-2">
                <button className="btn btn-accent" disabled={!canAct || busy} onClick={() => act({ action: "hit" })}>
                  Hit
                </button>
                <button className="btn btn-ghost" disabled={!canAct || busy} onClick={() => act({ action: "stand" })}>
                  Stand
                </button>
                <button className="btn btn-ghost" disabled={!canDouble || busy} onClick={() => act({ action: "double" })}>
                  Double
                </button>
                <button className="btn btn-ghost" disabled={!canSplit || busy} onClick={() => act({ action: "split" })}>
                  Split
                </button>
                <button className="btn btn-danger" disabled={!canSurrender || busy} onClick={() => act({ action: "surrender" })}>
                  Surrender
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </GameShell>
  );
}
