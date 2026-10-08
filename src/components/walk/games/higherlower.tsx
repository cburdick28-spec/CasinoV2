"use client";

import { useEffect, useRef } from "react";
import HigherLowerScene3D from "@/components/three/HigherLowerScene3D";
import type { Card, Suit } from "@/lib/types";
import { useActionHandler, useGameController } from "./useGameController";
import { useGameView, type GameBar, type Vec3 } from "./bridge";

/** Seated at the player edge of the oval table: the card in play on the left, the freshly revealed card dealt in beside it. */
export const camera: { eye: Vec3; target: Vec3 } = { eye: [0, 1.7, 1.4], target: [0, 0.8, 0.4] };

interface HLState {
  bet: number;
  pot: number;
  card: number;
  streak: number;
}

interface GuessResponse {
  nextCard?: number;
  push?: boolean;
  win?: boolean;
  state?: HLState | null;
  error?: string;
}

interface View {
  /** Rank on the left of the table (null = face down: the very first card is never shown). */
  left: number | null;
  /** The freshly revealed card dealt in on the right. */
  right: number | null;
  /** Bumps on every guess so the Stage remounts and replays the deal animation. */
  seq: number;
}

const FACE: Record<number, string> = { 1: "A", 11: "J", 12: "Q", 13: "K" };
const label = (n: number) => FACE[n] ?? String(n);

// The server only tracks each card's rank (1-13), not a suit, so for the 3D
// scene we derive a stable, purely decorative suit from the rank value.
const SUITS: Suit[] = ["S", "H", "D", "C"];
function toCard(n: number | null): Card | null {
  if (n === null) return null;
  return { rank: label(n) as Card["rank"], suit: SUITS[n % SUITS.length] };
}

/** The revealed card lands within about half a second. */
const ANIM_MS = 900;

const money = (n: number) => `$${n.toLocaleString()}`;

function barFor(st: HLState | null): GameBar {
  if (!st) {
    return {
      bet: true,
      betLocked: false,
      status: "Your first guess is made against a face-down card",
      buttons: [
        { id: "higher", label: "▲ Higher", primary: true },
        { id: "lower", label: "▼ Lower" },
      ],
      hint: "Bet, then guess. Esc or W A S D to step away",
    };
  }
  return {
    bet: true,
    betLocked: true,
    status: `Card ${label(st.card)} · Streak ${st.streak} · Pot ${money(st.pot)}`,
    buttons: [
      { id: "higher", label: "▲ Higher", primary: true },
      { id: "lower", label: "▼ Lower" },
      { id: "cashout", label: `Cash Out ${money(st.pot)}` },
    ],
    hint: "Guess again or cash out. Esc or W A S D to step away",
  };
}

/* ------------------------------ DOM side: logic ------------------------------ */

export function Controller() {
  const g = useGameController("higherlower");
  const seq = useRef(0);
  const st = useRef<HLState | null>(null);
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

  const show = (left: number | null, right: number | null) => {
    seq.current += 1;
    g.setView({ left, right, seq: seq.current } satisfies View);
  };

  // A streak stays open on the server (with its pot) until you lose or cash out; pick it up again.
  useEffect(() => {
    g.setBar(barFor(null));
    let alive = true;
    void g.request<{ state?: HLState | null }>("GET").then((res) => {
      const s = res.data.state;
      if (!alive || !res.ok || !s) return;
      st.current = s;
      show(s.card, null);
      g.update(barFor(s));
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g]);

  useActionHandler(async (id) => {
    if (id !== "higher" && id !== "lower" && id !== "cashout") return;
    if (!g.user()) {
      g.message("info", "Log in to place a bet");
      return;
    }

    if (id === "cashout") {
      g.setBusy(true);
      const res = await g.request<{ payout?: number; error?: string }>("POST", { action: "cashout" });
      g.setBusy(false);
      if (!res.ok) {
        const err = res.data.error || "Something went wrong";
        g.message("lose", err);
        g.toast("lose", err);
        if (res.status !== 0) {
          // The server has no open round: back to a fresh table.
          st.current = null;
          g.update(barFor(null));
        }
        return;
      }
      const payout = res.data.payout ?? 0;
      st.current = null;
      g.setView(null);
      g.update(barFor(null));
      g.message("win", `Cashed out ${money(payout)}`);
      g.toast("win", `Cashed out ${money(payout)}`);
      g.refresh();
      return;
    }

    const bet = Math.floor(g.bet());
    if (!st.current && (bet < 1 || bet > g.balance())) {
      g.message("lose", "Not enough balance for that bet");
      return;
    }
    const before = st.current?.card ?? null;
    g.setBusy(true);
    g.clearMessage();
    const res = await g.request<GuessResponse>("POST", { action: "guess", guess: id, bet: st.current ? undefined : bet });
    const d = res.data;
    if (!res.ok || typeof d.nextCard !== "number") {
      g.setBusy(false);
      const err = d.error || "Something went wrong";
      g.message("lose", err);
      g.toast("lose", err);
      return;
    }
    const next = d.nextCard;
    show(before, next);
    await wait(ANIM_MS);

    if (d.push) {
      st.current = d.state ?? null;
      g.update(barFor(st.current));
      g.message("info", "Push — cards matched.");
      g.toast("info", "Push — cards matched.");
    } else if (d.win) {
      st.current = d.state ?? null;
      g.update(barFor(st.current));
      const pot = st.current?.pot ?? 0;
      g.message("win", `Correct! Pot now ${money(pot)}`);
      g.toast("win", `Correct! Pot now ${money(pot)}`);
      if ((st.current?.streak ?? 0) >= 5) g.celebrate();
    } else {
      st.current = null;
      g.update(barFor(null));
      g.message("lose", `Wrong — next card was ${label(next)}.`);
      g.toast("lose", `Wrong — next card was ${label(next)}.`);
    }
    g.setBusy(false);
    g.refresh();
  });

  return null;
}

/* ------------------------------ Canvas side: 3D ------------------------------ */

/** The existing Higher/Lower scene, shrunk onto the station's oval table. Station-local coordinates. */
export function Stage() {
  const view = useGameView<View>() ?? { left: null, right: null, seq: 0 };
  return (
    <group position={[0, 0.885, -0.12]} scale={0.75}>
      <HigherLowerScene3D key={view.seq} flat felt={false} currentCard={toCard(view.left)} nextCard={toCard(view.right)} />
    </group>
  );
}
