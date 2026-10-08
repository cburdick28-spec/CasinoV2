"use client";

import { useEffect, useRef } from "react";
import VideoPokerScene3D from "@/components/three/VideoPokerScene3D";
import type { Card } from "@/lib/types";
import { useActionHandler, useGameController } from "./useGameController";
import { dispatchAction, useGameView, type GameBar, type Vec3 } from "./bridge";

/** Sat at the cabinet, looking at the five cards floating in front of its screen. */
export const camera: { eye: Vec3; target: Vec3 } = { eye: [0, 1.65, 1.5], target: [0, 1.3, 0.4] };

const SUIT_SYMBOL: Record<string, string> = { S: "♠", H: "♥", D: "♦", C: "♣" };
const money = (n: number) => `$${n.toLocaleString()}`;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const NO_HOLDS = [false, false, false, false, false];

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
const PAYTABLE_LINE = PAYTABLE.map((p) => `${p.name} ${p.mult}`).join(" · ");

type Stage = "bet" | "held" | "result";
interface View {
  hand: (Card | null)[];
  holds: boolean[];
  stage: Stage;
}

/* ------------------------------ DOM side: logic ------------------------------ */

function barFor(stage: Stage, hand: Card[] | null, holds: boolean[]): GameBar {
  if (stage === "held" && hand) {
    return {
      bet: true,
      betLocked: true,
      status: "Hold the cards you want to keep, then Draw",
      buttons: [
        ...hand.map((c, i) => ({ id: `hold:${i}`, label: `${holds[i] ? "HELD " : "Hold "}${c.rank}${SUIT_SYMBOL[c.suit]}`, tone: holds[i] ? ("gold" as const) : undefined })),
        { id: "draw", label: "Draw", primary: true },
      ],
      hint: "Click a card in 3D or press 1-5 to hold it · E draws",
    };
  }
  return {
    bet: true,
    betLocked: false,
    buttons: [{ id: "deal", label: stage === "result" ? "Deal Again" : "Deal", primary: true }],
    hint: `Jacks or Better 9/6 · ${PAYTABLE_LINE}`,
  };
}

export function Controller() {
  const g = useGameController("videopoker");
  const hand = useRef<Card[] | null>(null);
  const holds = useRef<boolean[]>(NO_HOLDS);
  const stage = useRef<Stage>("bet");
  const roundBet = useRef(0);
  const alive = useRef(true);

  const publish = (hands?: (Card | null)[]) => {
    g.setView({ hand: hands ?? hand.current ?? Array(5).fill(null), holds: holds.current, stage: stage.current } satisfies View);
    g.update(barFor(stage.current, hand.current, holds.current));
  };

  // Not in the 2D page, but the server keeps a dealt hand until it is drawn: pick it up so the player is never stuck.
  useEffect(() => {
    alive.current = true;
    g.setBar(barFor("bet", null, NO_HOLDS));
    g.setView({ hand: Array(5).fill(null), holds: NO_HOLDS, stage: "bet" } satisfies View);
    void g.request<{ state?: { bet: number; hand: Card[] } }>("GET").then((res) => {
      if (!alive.current || !res.ok || !res.data.state) return;
      hand.current = res.data.state.hand;
      holds.current = NO_HOLDS;
      stage.current = "held";
      roundBet.current = res.data.state.bet;
      publish();
    });
    return () => {
      alive.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g]);

  async function deal() {
    if (!g.user()) {
      g.message("info", "Log in to place a bet");
      return;
    }
    const bet = g.bet();
    if (bet > g.balance()) {
      g.message("lose", "Not enough balance for that bet");
      return;
    }
    g.setBusy(true);
    g.clearMessage();
    // New deal: back to face-down cards while the request is out.
    hand.current = null;
    holds.current = NO_HOLDS;
    stage.current = "bet";
    publish();
    const res = await g.request<{ hand?: Card[]; error?: string }>("POST", { action: "deal", bet });
    if (!res.ok || !res.data.hand) {
      g.setBusy(false);
      const err = res.data.error || "Something went wrong";
      g.message("lose", err);
      g.toast("lose", err);
      return;
    }
    hand.current = res.data.hand;
    roundBet.current = bet;
    stage.current = "held";
    publish();
    g.refresh();
    await sleep(750); // cards land
    if (alive.current) g.setBusy(false);
  }

  function toggleHold(i: number) {
    if (stage.current !== "held" || !hand.current) return;
    holds.current = holds.current.map((v, idx) => (idx === i ? !v : v));
    publish();
  }

  async function draw() {
    if (stage.current !== "held") return;
    g.setBusy(true);
    const res = await g.request<{ hand?: Card[]; handName?: string; mult?: number; payout?: number; won?: boolean; error?: string }>("POST", {
      action: "draw",
      holds: holds.current,
    });
    if (!res.ok || !res.data.hand) {
      g.setBusy(false);
      const err = res.data.error || "Something went wrong";
      g.message("lose", err);
      g.toast("lose", err);
      return;
    }
    const { hand: final, handName = "", mult = 0, payout = 0, won } = res.data;
    const bet = roundBet.current;
    hand.current = final;
    stage.current = "result";
    publish();
    await sleep(900); // replacement cards fly in
    if (!alive.current) return;
    const net = payout - bet;
    if (won) {
      g.message("win", `${handName} — ${mult}x (+${money(net)})`);
      g.toast("win", `${handName}! +${money(net)}`);
      if (mult >= 9) g.celebrate();
    } else {
      g.message("lose", `${handName} — -${money(bet)}`);
      g.toast("lose", `${handName} — -${money(bet)}`);
    }
    g.setBusy(false);
    g.refresh();
  }

  useActionHandler((id) => {
    if (id === "deal") void deal();
    else if (id === "draw") void draw();
    else if (id.startsWith("hold:")) toggleHold(Number(id.slice(5)));
  });

  return null;
}

/* ------------------------------ Canvas side: 3D ------------------------------ */

/** The existing five-card scene, stood up in front of the cabinet screen. Click a card to hold it. */
export function Stage() {
  const view = useGameView<View>();
  if (!view) return null;
  return (
    <group position={[0, 1.5, 0.5]} rotation={[-0.2, 0, 0]} scale={0.3}>
      <VideoPokerScene3D hand={view.hand} holds={view.holds} felt={false} onToggle={view.stage === "held" ? (i) => dispatchAction(`hold:${i}`) : undefined} />
    </group>
  );
}
