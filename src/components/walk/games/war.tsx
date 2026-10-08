"use client";

import { useEffect, useRef } from "react";
import WarScene3D from "@/components/three/WarScene3D";
import type { Card } from "@/lib/types";
import { useActionHandler, useGameController } from "./useGameController";
import { useGameView, type GameBar, type Vec3 } from "./bridge";

/** Seated at the player edge of the oval table: your card in front on the left, the dealer's across the felt. */
export const camera: { eye: Vec3; target: Vec3 } = { eye: [0, 1.75, 1.6], target: [0, 0.5, 0.1] };

interface View {
  playerCard: Card | null;
  dealerCard: Card | null;
  warPlayerCard: Card | null;
  warDealerCard: Card | null;
  tied: boolean;
  /** Bumps on every draw so the Stage remounts and replays the deal animation. */
  seq: number;
}

interface WarResponse {
  result?: "tie" | "win" | "lose" | "surrendered";
  playerCard?: Card;
  dealerCard?: Card;
  payout?: number;
  state?: { bet: number; playerCard: Card; dealerCard: Card } | null;
  error?: string;
}

/** Cards deal in over about half a second; wait for them before the bar and result move. */
const ANIM_MS = 1000;

const money = (n: number) => `$${n.toLocaleString()}`;

function barFor(pendingBet: number | null): GameBar {
  if (pendingBet === null) {
    return { bet: true, betLocked: false, buttons: [{ id: "draw", label: "Draw", primary: true }], hint: "Esc or W A S D to step away" };
  }
  return {
    bet: true,
    betLocked: true,
    status: "War! Matching cards.",
    buttons: [
      { id: "war", label: `Go To War (+${money(pendingBet)})`, primary: true },
      { id: "surrender", label: `Surrender (keep ${money(Math.floor(pendingBet / 2))})` },
    ],
    hint: "Surrender for half back, or match your bet. A second tie always goes your way",
  };
}

/* ------------------------------ DOM side: logic ------------------------------ */

export function Controller() {
  const g = useGameController("war");
  const seq = useRef(0);
  const view = useRef<View>({ playerCard: null, dealerCard: null, warPlayerCard: null, warDealerCard: null, tied: false, seq: 0 });
  const pending = useRef<number | null>(null);
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

  const show = (patch: Partial<View>, deal = false) => {
    if (deal) seq.current += 1;
    view.current = { ...view.current, ...patch, seq: seq.current };
    g.setView(view.current);
  };

  // A tied hand stays open on the server until you surrender or go to war; pick it up again.
  useEffect(() => {
    g.setBar(barFor(null));
    let alive = true;
    void g.request<WarResponse>("GET").then((res) => {
      const s = res.data.state;
      if (!alive || !res.ok || !s) return;
      pending.current = s.bet;
      show({ playerCard: s.playerCard, dealerCard: s.dealerCard, warPlayerCard: null, warDealerCard: null, tied: true }, true);
      g.update(barFor(s.bet));
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g]);

  /** Result line, toast and balance for a settled hand. */
  const finish = (result: "win" | "lose", payout: number, staked: number) => {
    const net = payout - staked;
    if (result === "win") {
      g.toast("win", `You win! +${money(net)}`);
      g.message("win", `You win! +${money(net)}`);
      if (staked >= g.bet() * 2) g.celebrate();
    } else {
      g.toast("lose", `Dealer wins. -${money(staked)}`);
      g.message("lose", `Dealer wins. -${money(staked)}`);
    }
    g.refresh();
  };

  useActionHandler(async (id) => {
    if (id !== "draw" && id !== "surrender" && id !== "war") return;
    if (!g.user()) {
      g.message("info", "Log in to place a bet");
      return;
    }
    const bet = Math.floor(g.bet());

    if (id === "draw") {
      if (bet < 1 || bet > g.balance()) {
        g.message("lose", "Not enough balance for that bet");
        return;
      }
      g.setBusy(true);
      g.clearMessage();
      show({ tied: false, warPlayerCard: null, warDealerCard: null });
      const res = await g.request<WarResponse>("POST", { action: "draw", bet });
      const d = res.data;
      if (!res.ok || !d.playerCard || !d.dealerCard) {
        g.setBusy(false);
        const err = d.error || "Something went wrong";
        g.message("lose", err);
        g.toast("lose", err);
        return;
      }
      const isTie = d.result === "tie";
      show({ playerCard: d.playerCard, dealerCard: d.dealerCard, warPlayerCard: null, warDealerCard: null, tied: isTie }, true);
      await wait(ANIM_MS);
      if (isTie) {
        pending.current = bet;
        g.update(barFor(bet));
        g.message("info", "Tie! Surrender for half back, or go to war.");
        g.toast("info", "Tie! Surrender for half back, or go to war.");
        g.setBusy(false);
        g.refresh();
        return;
      }
      g.update(barFor(null));
      finish(d.result === "win" ? "win" : "lose", d.payout ?? 0, bet);
      g.setBusy(false);
      return;
    }

    const staked = pending.current ?? 0;

    if (id === "surrender") {
      g.setBusy(true);
      const res = await g.request<WarResponse>("POST", { action: "surrender" });
      g.setBusy(false);
      if (!res.ok) {
        const err = res.data.error || "Something went wrong";
        g.message("lose", err);
        g.toast("lose", err);
        if (res.status !== 0) {
          // The server has no open war round: go back to a fresh table.
          pending.current = null;
          show({ tied: false });
          g.update(barFor(null));
        }
        return;
      }
      pending.current = null;
      show({ tied: false });
      g.update(barFor(null));
      const kept = res.data.payout ?? 0;
      g.toast("info", `Surrendered — kept ${money(kept)}`);
      g.message("info", `Surrendered — kept ${money(kept)} of your ${money(staked)} bet`);
      g.refresh();
      return;
    }

    // id === "war"
    if (staked > g.balance()) {
      g.message("lose", "Not enough balance to go to war");
      return;
    }
    g.setBusy(true);
    g.clearMessage();
    const res = await g.request<WarResponse>("POST", { action: "war" });
    const d = res.data;
    if (!res.ok || !d.playerCard || !d.dealerCard) {
      g.setBusy(false);
      const err = d.error || "Something went wrong";
      g.message("lose", err);
      g.toast("lose", err);
      if (res.status !== 0) {
        pending.current = null;
        show({ tied: false });
        g.update(barFor(null));
      }
      return;
    }
    // Keep the tied cards where they are and deal the war cards further forward, so both pairs stay visible.
    show({ warPlayerCard: d.playerCard, warDealerCard: d.dealerCard, tied: false });
    pending.current = null;
    g.update(barFor(null));
    await wait(ANIM_MS);
    finish(d.result === "win" ? "win" : "lose", d.payout ?? 0, staked * 2);
    g.setBusy(false);
  });

  return null;
}

/* ------------------------------ Canvas side: 3D ------------------------------ */

/** The existing Casino War scene, shrunk onto the station's oval table. Station-local coordinates. */
export function Stage() {
  const view = useGameView<View>();
  if (!view || (!view.playerCard && !view.dealerCard)) return null;
  return (
    <group position={[0, 0.885, -0.22]} scale={0.42}>
      <WarScene3D
        key={view.seq}
        flat
        felt={false}
        batonY={0.5}
        playerCard={view.playerCard}
        dealerCard={view.dealerCard}
        warPlayerCard={view.warPlayerCard}
        warDealerCard={view.warDealerCard}
        tied={view.tied}
      />
    </group>
  );
}
