"use client";

import { useEffect, useRef } from "react";
import { DiceTray3D } from "@/components/three/Dice3D";
import { useActionHandler, useGameController } from "./useGameController";
import { useGameView, type GameBar, type Vec3 } from "./bridge";

/** Seated at the round table; the dice cage sits in the centre of the layout. */
export const camera: { eye: Vec3; target: Vec3 } = { eye: [0, 1.8, 1.3], target: [0, 0.0, 0.0] };

type BetType = "big" | "small" | "anyTriple" | "specificTriple" | "number";
interface Choice {
  type: BetType;
  number?: number;
}
interface RollResponse {
  dice: number[];
  mult: number;
  payout: number;
  won: boolean;
  error?: string;
}
interface View {
  dice: number[];
  rolling: boolean;
}

const money = (n: number) => `$${n.toLocaleString()}`;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// Same bets, labels and odds as the 2D page.
const BASE_BETS: { type: "big" | "small" | "anyTriple"; label: string; odds: string }[] = [
  { type: "big", label: "Big (11-17)", odds: "1:1" },
  { type: "small", label: "Small (4-10)", odds: "1:1" },
  { type: "anyTriple", label: "Any Triple", odds: "30:1" },
];

function choiceLabel(c: Choice) {
  if (c.type === "number") return `Number ${c.number}`;
  if (c.type === "specificTriple") return `Triple ${c.number}s`;
  return BASE_BETS.find((b) => b.type === c.type)?.label ?? c.type;
}

function barFor(c: Choice, last: number[] | null): GameBar {
  const faceBet = c.type === "number" || c.type === "specificTriple";
  const note = c.type === "number" ? " (1:1 per matching die)" : c.type === "specificTriple" ? " (181:1)" : "";
  const lastLine = last ? `Dice ${last.join(" ")} = ${last.reduce((a, b) => a + b, 0)} · ` : "";
  return {
    bet: true,
    status: `${lastLine}Betting: ${choiceLabel(c)}${note}`,
    choices: [
      {
        id: "type",
        label: "Bet on",
        items: [
          ...BASE_BETS.map((b) => ({ id: b.type, label: `${b.label} ${b.odds}`, active: c.type === b.type })),
          { id: "number", label: "Number", active: c.type === "number" },
          { id: "specificTriple", label: "Triple 181:1", active: c.type === "specificTriple" },
        ],
      },
    ],
    picker: faceBet ? { id: "face", label: c.type === "number" ? "Which number" : "Which triple", count: 6, first: 1, cols: 6, selected: [c.number ?? 1] } : undefined,
    buttons: [{ id: "roll", label: "Roll", primary: true }],
    hint: "Left/Right choose the bet",
  };
}

export function Controller() {
  const g = useGameController("sicbo");
  const choice = useRef<Choice>({ type: "big" });
  const last = useRef<number[] | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    g.setBar(barFor(choice.current, null));
    g.setView({ dice: [1, 3, 5], rolling: false } satisfies View);
    return () => {
      alive.current = false;
    };
  }, [g]);

  const publish = () => g.update(barFor(choice.current, last.current));

  async function roll() {
    if (!g.user()) {
      g.message("info", "Log in to place a bet");
      return;
    }
    const bet = Math.floor(g.bet());
    if (bet > g.balance()) {
      g.message("lose", "Not enough balance for that bet");
      return;
    }
    const c = choice.current;
    const body: Record<string, unknown> = { bet, betType: c.type };
    if (c.number !== undefined && (c.type === "number" || c.type === "specificTriple")) body.number = c.number;
    const shown = last.current ?? [1, 3, 5];
    g.setBusy(true);
    g.clearMessage();
    g.setView({ dice: shown, rolling: true } satisfies View);
    const res = await g.request<RollResponse>("POST", body);
    if (!res.ok || !Array.isArray(res.data.dice)) {
      const err = res.data.error || "Something went wrong";
      g.toast("lose", err);
      if (!alive.current) return;
      g.setView({ dice: shown, rolling: false } satisfies View);
      g.setBusy(false);
      g.message("lose", err);
      return;
    }
    const d = res.data;
    if (alive.current) g.setView({ dice: d.dice, rolling: true } satisfies View);
    await sleep(1400);
    if (alive.current) g.setView({ dice: d.dice, rolling: false } satisfies View);
    await sleep(500);
    const net = d.payout - bet;
    g.toast(net >= 0 ? "win" : "lose", `${net >= 0 ? "+" : "-"}${money(Math.abs(net))}`);
    g.refresh();
    if (!alive.current) return;
    last.current = d.dice;
    g.setBusy(false);
    publish();
    if (net >= 0) {
      g.message("win", `${choiceLabel(c)} hit! +${money(net)}`);
      if (d.mult >= 30) g.celebrate();
    } else {
      g.message("lose", `No match — -${money(bet)}`);
    }
  }

  useActionHandler((id) => {
    const [head, rest] = id.split(":");
    if (head === "type") {
      const type = rest as BetType;
      const faceBet = type === "number" || type === "specificTriple";
      choice.current = { type, number: faceBet ? choice.current.number ?? 1 : undefined };
      publish();
    } else if (head === "face") {
      const type = choice.current.type === "specificTriple" ? "specificTriple" : "number";
      choice.current = { type, number: Number(rest) };
      publish();
    } else if (id === "roll") void roll();
  });

  return null;
}

/* ------------------------------ Canvas side: 3D ------------------------------ */

/** The existing three-dice tumble, sitting on the pedestal under the dome in the middle of the table. */
export function Stage() {
  const view = useGameView<View>();
  return (
    <group position={[0, 0.875 + 0.185, 0]} scale={0.26}>
      <DiceTray3D tray={false} values={view?.dice ?? [1, 3, 5]} rolling={view?.rolling ?? false} />
    </group>
  );
}
