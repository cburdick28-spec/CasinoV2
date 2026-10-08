"use client";

import { useEffect, useRef, useState } from "react";
import BaccaratScene3D from "@/components/three/BaccaratScene3D";
import type { Card } from "@/lib/types";
import { useActionHandler, useGameController } from "./useGameController";
import { useGameView, type GameBar, type Vec3 } from "./bridge";

/** Seated at the player edge of the oval table: the Player hand on the left, the Banker hand on the right. */
export const camera: { eye: Vec3; target: Vec3 } = { eye: [0, 1.75, 1.6], target: [0, 0.5, 0.2] };

type Side = "player" | "banker" | "tie";

interface RoundResult {
  player: Card[];
  banker: Card[];
  playerTotal: number;
  bankerTotal: number;
  winner: Side;
  payout: number;
  error?: string;
}

interface View {
  round: RoundResult | null;
  /** Bumps on every deal so the Stage remounts and replays the deal animation. */
  seq: number;
}

const SIDES: { id: Side; label: string }[] = [
  { id: "player", label: "Player (2:1)" },
  { id: "banker", label: "Banker (1.95:1)" },
  { id: "tie", label: "Tie (9:1)" },
];

/** Up to five cards deal in with a stagger of about 0.12s each; wait for the last to land. */
const ANIM_MS = 1200;

const money = (n: number) => `$${n.toLocaleString()}`;

function barFor(side: Side, round: RoundResult | null, shown: boolean): GameBar {
  return {
    bet: true,
    status: round && shown ? `Player ${round.playerTotal} · Banker ${round.bankerTotal}` : undefined,
    choices: [{ id: "side", label: "Bet on", items: SIDES.map((s) => ({ id: s.id, label: s.label, active: s.id === side })) }],
    buttons: [{ id: "deal", label: "Deal", primary: true }],
    hint: "Left/Right picks a side. Esc or W A S D to step away",
  };
}

/* ------------------------------ DOM side: logic ------------------------------ */

export function Controller() {
  const g = useGameController("baccarat");
  const [side, setSide] = useState<Side>("player");
  const sideRef = useRef<Side>("player");
  const seq = useRef(0);
  const last = useRef<RoundResult | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(
    () => () => {
      timers.current.forEach((t) => clearTimeout(t));
    },
    []
  );

  useEffect(() => {
    g.update(barFor(side, last.current, true));
  }, [g, side]);

  useActionHandler(async (id) => {
    if (id.startsWith("side:")) {
      const s = id.slice(5) as Side;
      if (!SIDES.some((x) => x.id === s)) return;
      sideRef.current = s;
      setSide(s);
      return;
    }
    if (id !== "deal") return;
    if (!g.user()) {
      g.message("info", "Log in to place a bet");
      return;
    }
    const bet = Math.floor(g.bet());
    if (bet < 1 || bet > g.balance()) {
      g.message("lose", "Not enough balance for that bet");
      return;
    }
    const pick = sideRef.current;
    g.setBusy(true);
    g.clearMessage();
    const res = await g.request<RoundResult>("POST", { bet, side: pick });
    if (!res.ok || !Array.isArray(res.data.player)) {
      g.setBusy(false);
      const err = res.data.error || "Something went wrong";
      g.message("lose", err);
      g.toast("lose", err);
      return;
    }
    const data = res.data;
    seq.current += 1;
    last.current = data;
    g.setView({ round: data, seq: seq.current } satisfies View);
    g.update(barFor(pick, data, false));
    await new Promise<void>((resolve) => {
      timers.current.push(window.setTimeout(resolve, ANIM_MS));
    });
    g.update(barFor(pick, data, true));

    const net = data.payout - bet;
    const head = `${data.winner.toUpperCase()} wins`;
    g.message(net > 0 ? "win" : net === 0 ? "info" : "lose", `${head} — ${net > 0 ? `+${money(net)}` : net === 0 ? "Push" : `-${money(bet)}`}`);
    g.toast(net > 0 ? "win" : net === 0 ? "info" : "lose", `${head} — ${net >= 0 ? "+" : ""}$${net.toLocaleString()}`);
    if (net >= bet * 4) g.celebrate();
    g.setBusy(false);
    g.refresh();
  });

  return null;
}

/* ------------------------------ Canvas side: 3D ------------------------------ */

/** The existing Punto Banco scene, shrunk onto the station's oval table (felt and chips come from the station model). */
export function Stage() {
  const view = useGameView<View>();
  const round = view?.round;
  if (!round) return null;
  return (
    <group position={[0, 0.885, 0.1]} scale={0.42}>
      <BaccaratScene3D key={view.seq} flat compact felt={false} chips={false} playerCards={round.player} bankerCards={round.banker} />
    </group>
  );
}
