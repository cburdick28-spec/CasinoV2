"use client";

import { useEffect, useRef } from "react";
import BlackjackScene3D from "@/components/three/BlackjackScene3D";
import type { Card } from "@/lib/types";
import { useActionHandler, useGameController } from "./useGameController";
import { useGameView, type GameBar, type Vec3 } from "./bridge";

/** Seated at the player side of the half-moon table, looking down over the felt. */
export const camera: { eye: Vec3; target: Vec3 } = { eye: [0, 1.62, 1.55], target: [0, 0.8, 0.05] };

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
interface View {
  state: StateView | null;
  /** Bumps on every new deal so the Stage remounts and replays the deal animation. */
  seq: number;
}

/* ------------------------------ DOM side: logic ------------------------------ */

function barFor(st: StateView | null, money: number): GameBar {
  if (!st || !st.active) {
    return { bet: true, betLocked: false, buttons: [{ id: "deal", label: "Deal", primary: true }], hint: "Esc or W A S D to step away" };
  }
  if (st.insuranceOffered) {
    return {
      bet: true,
      betLocked: true,
      status: "Dealer shows an Ace. Buy insurance?",
      buttons: [
        { id: "ins-yes", label: "Yes", primary: true },
        { id: "ins-no", label: "No" },
      ],
    };
  }
  const hand = st.hands[st.current];
  const canAct = !!hand && !hand.finished;
  const two = canAct && hand.cards.length === 2;
  const canDouble = two && !hand.doubled && hand.bet <= money;
  const canSplit = two && hand.cards[0].rank === hand.cards[1].rank && hand.bet <= money && st.hands.length < 4;
  const canSurrender = two && st.hands.length === 1;
  return {
    bet: true,
    betLocked: true,
    status: `Hand ${st.current + 1}: ${hand?.value ?? 0} · Bet $${(hand?.bet ?? 0).toLocaleString()}${st.dealerValue !== null ? ` · Dealer ${st.dealerValue}` : ""}`,
    buttons: [
      { id: "hit", label: "Hit", primary: true, disabled: !canAct },
      { id: "stand", label: "Stand", disabled: !canAct },
      { id: "double", label: "Double", disabled: !canDouble },
      { id: "split", label: "Split", disabled: !canSplit },
      { id: "surrender", label: "Surrender", tone: "danger", disabled: !canSurrender },
    ],
  };
}

export function Controller() {
  const g = useGameController("blackjack");
  const seq = useRef(0);

  const publish = (st: StateView | null, deal = false) => {
    if (deal) seq.current += 1;
    g.setView({ state: st, seq: seq.current } satisfies View);
    g.update(barFor(st, g.balance()));
  };

  // Pick up a hand that is still running on the server.
  useEffect(() => {
    g.setBar(barFor(null, g.balance()));
    let alive = true;
    void g.request<{ state?: StateView }>("GET").then((res) => {
      if (alive && res.ok && res.data.state) publish(res.data.state);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g]);

  useActionHandler(async (id) => {
    const bodies: Record<string, Record<string, unknown>> = {
      deal: { action: "deal", bet: g.bet() },
      hit: { action: "hit" },
      stand: { action: "stand" },
      double: { action: "double" },
      split: { action: "split" },
      surrender: { action: "surrender" },
      "ins-yes": { action: "insurance", take: true },
      "ins-no": { action: "insurance", take: false },
    };
    const body = bodies[id];
    if (!body) return;
    if (!g.user()) {
      g.message("info", "Log in to place a bet");
      return;
    }
    if (id === "deal" && g.bet() > g.balance()) {
      g.message("lose", "Not enough balance for that bet");
      return;
    }
    g.setBusy(true);
    const res = await g.request<{ state?: StateView; messages?: string[]; error?: string }>("POST", body);
    g.setBusy(false);
    if (!res.ok || !res.data.state) {
      g.message("lose", res.data.error || "Something went wrong");
      return;
    }
    const msgs = res.data.messages ?? [];
    publish(res.data.state, id === "deal");
    if (msgs.length) {
      const anyWin = msgs.some((m) => m.includes("+$"));
      g.message(anyWin ? "win" : msgs.every((m) => m.includes("Push")) ? "info" : "lose", msgs.join("  "));
      g.toast(anyWin ? "win" : "lose", msgs.join(" "));
      if (msgs.some((m) => m.includes("Blackjack!"))) g.celebrate();
    } else {
      g.clearMessage();
    }
    g.refresh();
  });

  return null;
}

/* ------------------------------ Canvas side: 3D ------------------------------ */

/** The existing 3D table scene, shrunk onto the station's half-moon table. Station-local coordinates. */
export function Stage() {
  const view = useGameView<View>();
  const st = view?.state;
  if (!st) return null;
  return (
    <group position={[0, 0.885, 0.05]} scale={0.36}>
      <BlackjackScene3D
        key={view.seq}
        chips={false}
        dealerCards={st.dealer.length ? st.dealer : [null]}
        hands={st.hands.map((h) => h.cards)}
        activeHandIndex={st.active ? st.current : undefined}
      />
    </group>
  );
}
