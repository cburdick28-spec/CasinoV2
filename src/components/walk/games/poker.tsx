"use client";

import { useEffect, useRef } from "react";
import PokerScene3D from "@/components/three/PokerScene3D";
import type { Card } from "@/lib/types";
import { useActionHandler, useGameController } from "./useGameController";
import { useGameView, type GameBar, type Vec3 } from "./bridge";

/** Seated at the player edge of the oval table: your hole cards in front, the board in the middle, the dealer at the back. */
export const camera: { eye: Vec3; target: Vec3 } = { eye: [0, 1.75, 1.6], target: [0, 0.5, 0.1] };

type Stage = "preflop" | "flop" | "turn" | "river" | "result";

interface StateView {
  player: Card[];
  dealer: (Card | null)[];
  community: Card[];
  pot: number;
  bet: number;
  stage: Stage;
}

interface ResultView {
  outcome: "win" | "lose" | "chop";
  net: number;
  playerHand: string;
  dealerHand: string;
}

interface PokerResponse {
  state?: StateView;
  folded?: boolean;
  net?: number;
  result?: ResultView;
  error?: string;
}

interface View {
  state: StateView | null;
  /** Bumps on every new deal so the Stage remounts and replays the deal animation. */
  seq: number;
}

const STAGE_LABEL: Record<Stage, string> = {
  preflop: "Pre-Flop",
  flop: "Flop",
  turn: "Turn",
  river: "River",
  result: "Showdown",
};

/** The 2D page has a free number box (default 5); here it is a row of sizes. */
const RAISES = [1, 5, 10, 25, 50, 100, 250, 500, 1000];
/** Cards deal in over about half a second (staggered); wait that long before the bar and result move. */
const ANIM_MS = 1100;

const money = (n: number) => `$${n.toLocaleString()}`;

/* ------------------------------ DOM side: logic ------------------------------ */

function barFor(st: StateView | null, raise: number): GameBar {
  if (!st || st.stage === "result") {
    return {
      bet: true,
      betLocked: false,
      status: st ? `${STAGE_LABEL.result} · Pot ${money(st.pot)}` : undefined,
      buttons: [{ id: "deal", label: st ? "Deal Again" : "Deal", primary: true }],
      hint: "Ante = bet. Esc or W A S D to step away",
    };
  }
  return {
    status: `${STAGE_LABEL[st.stage]} · Pot ${money(st.pot)}`,
    choices: [
      {
        id: "raise",
        label: "Raise size",
        items: RAISES.map((n) => ({ id: String(n), label: money(n), active: n === raise })),
      },
    ],
    buttons: [
      { id: "check", label: st.stage === "river" ? "Check (Showdown)" : "Check", primary: true },
      { id: "raise-go", label: `Raise ${money(raise)}` },
      { id: "fold", label: "Fold", tone: "danger" },
    ],
    hint: "Esc or W A S D to step away",
  };
}

export function Controller() {
  const g = useGameController("poker");
  const seq = useRef(0);
  const st = useRef<StateView | null>(null);
  const raise = useRef(5);
  const timers = useRef<number[]>([]);

  useEffect(
    () => () => {
      timers.current.forEach((t) => clearTimeout(t));
    },
    []
  );
  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      timers.current.push(window.setTimeout(resolve, ms));
    });

  const publishView = (deal = false) => {
    if (deal) seq.current += 1;
    g.setView({ state: st.current, seq: seq.current } satisfies View);
  };
  const publishBar = () => g.update(barFor(st.current, raise.current));

  // Poker keeps a hand on the server between requests; pick it up again if one is running.
  useEffect(() => {
    g.setBar(barFor(null, raise.current));
    let alive = true;
    void g.request<PokerResponse>("GET").then((res) => {
      if (!alive || !res.ok || !res.data.state) return;
      st.current = res.data.state;
      publishView(true);
      publishBar();
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g]);

  useActionHandler(async (id) => {
    if (id.startsWith("raise:")) {
      raise.current = Number(id.slice(6)) || 5;
      publishBar();
      return;
    }
    const ante = g.bet();
    const bodies: Record<string, Record<string, unknown>> = {
      deal: { action: "deal", bet: ante },
      check: { action: "check" },
      "raise-go": { action: "raise", amount: raise.current },
      fold: { action: "fold" },
    };
    const body = bodies[id];
    if (!body) return;
    if (!g.user()) {
      g.message("info", "Log in to place a bet");
      return;
    }
    if (id === "deal" && ante > g.balance()) {
      g.message("lose", "Not enough balance for that ante");
      return;
    }
    if (id === "raise-go" && raise.current > g.balance()) {
      g.message("lose", "Not enough balance for that raise");
      return;
    }

    g.setBusy(true);
    if (id === "deal") g.clearMessage();
    const res = await g.request<PokerResponse>("POST", body);
    const data = res.data;
    if (!res.ok) {
      g.setBusy(false);
      const err = data.error || "Something went wrong";
      g.message("lose", err);
      g.toast("lose", err);
      if (/No active hand/i.test(err)) {
        // The server has no hand: drop the stale table.
        st.current = null;
        publishView();
        publishBar();
      }
      return;
    }

    if (data.folded) {
      st.current = null;
      publishView();
      publishBar();
      g.setBusy(false);
      const net = data.net ?? 0;
      g.message("lose", `Folded -${money(net)}`);
      g.toast("lose", `Folded -${money(net)}`);
      g.refresh();
      return;
    }

    if (!data.state) {
      g.setBusy(false);
      g.message("lose", "Something went wrong");
      return;
    }
    st.current = data.state;
    publishView(id === "deal");
    await wait(ANIM_MS); // let the cards land before the bar and the result move
    publishBar();

    const r = data.result;
    if (r) {
      const amount = r.net ? ` ${money(Math.abs(r.net))}` : "";
      if (r.outcome === "win") g.message("win", `You win! ${r.playerHand} beats ${r.dealerHand} (+${money(r.net)})`);
      else if (r.outcome === "lose") g.message("lose", `Dealer wins with ${r.dealerHand} over your ${r.playerHand} (-${money(r.net)})`);
      else g.message("info", `Chop! Both have ${r.playerHand} — bet returned`);
      g.toast(r.outcome === "win" ? "win" : r.outcome === "lose" ? "lose" : "info", `${r.outcome.toUpperCase()}${amount}`);
      if (r.outcome === "win" && r.playerHand === "Royal Flush") g.celebrate();
    }
    g.setBusy(false);
    g.refresh();
  });

  return null;
}

/* ------------------------------ Canvas side: 3D ------------------------------ */

/** The existing Hold'em scene, shrunk onto the station's oval table (felt and chips come from the station model). */
export function Stage() {
  const view = useGameView<View>();
  const st = view?.state;
  if (!st) return null;
  return (
    <group position={[0, 0.885, 0.0]} scale={0.46}>
      <PokerScene3D key={view.seq} flat compact felt={false} chips={false} playerCards={st.player} dealerCards={st.dealer} community={st.community} />
    </group>
  );
}
