"use client";

import { useEffect, useRef } from "react";
import RouletteScene3D from "@/components/three/RouletteScene3D";
import { useActionHandler, useGameController } from "./useGameController";
import { useGameView, type GameBar, type Vec3 } from "./bridge";

/** Seated at the player edge of the oval table: number grid in the foreground, the wheel on its stand behind it. */
export const camera: { eye: Vec3; target: Vec3 } = { eye: [0, 1.65, 1.5], target: [0, 0.3, -0.2] };

type BetType = "straight" | "red" | "black" | "odd" | "even" | "low" | "high" | "dozen1" | "dozen2" | "dozen3" | "col1" | "col2" | "col3";

// Same list, labels and payouts as the 2D page.
const OUTSIDE_BETS: { type: BetType; label: string; payout: string }[] = [
  { type: "red", label: "Red", payout: "1:1" },
  { type: "black", label: "Black", payout: "1:1" },
  { type: "odd", label: "Odd", payout: "1:1" },
  { type: "even", label: "Even", payout: "1:1" },
  { type: "low", label: "1-18", payout: "1:1" },
  { type: "high", label: "19-36", payout: "1:1" },
  { type: "dozen1", label: "1st 12", payout: "2:1" },
  { type: "dozen2", label: "2nd 12", payout: "2:1" },
  { type: "dozen3", label: "3rd 12", payout: "2:1" },
  { type: "col1", label: "Column 1", payout: "2:1" },
  { type: "col2", label: "Column 2", payout: "2:1" },
  { type: "col3", label: "Column 3", payout: "2:1" },
];

const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const numColor = (n: number) => (n === 0 ? "green" : RED_NUMBERS.has(n) ? "red" : "black");
const money = (n: number) => `$${n.toLocaleString()}`;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

interface BetSlip {
  type: BetType;
  amount: number;
  number?: number;
}
interface BetResult extends BetSlip {
  win: boolean;
  payout: number;
}
interface SpinResponse {
  spin: number;
  color: string;
  results: BetResult[];
  totalBet: number;
  totalPayout: number;
  net: number;
  error?: string;
}
interface View {
  spinning: boolean;
  winning: number | null;
}

const betLabel = (b: { type: BetType; number?: number }) =>
  b.type === "straight" ? `#${b.number}` : OUTSIDE_BETS.find((o) => o.type === b.type)?.label ?? b.type;

/** Slip as one line, same bets merged together ("Red $20 · #17 $5"). */
function slipLine(slip: BetSlip[]) {
  const merged = new Map<string, number>();
  for (const b of slip) {
    const k = betLabel(b);
    merged.set(k, (merged.get(k) ?? 0) + b.amount);
  }
  return [...merged].map(([k, v]) => `${k} ${money(v)}`).join(" · ");
}

interface Ui {
  slip: BetSlip[];
  type: BetType;
  num: number;
}

function barFor(ui: Ui, status?: string): GameBar {
  const total = ui.slip.reduce((s, b) => s + b.amount, 0);
  return {
    bet: true,
    status: status ?? (ui.slip.length ? `Slip: ${slipLine(ui.slip)}  (total ${money(total)})` : "Place your bets, then spin once"),
    choices: [
      {
        id: "type",
        label: "Bet on",
        items: [
          ...OUTSIDE_BETS.map((o) => ({ id: o.type, label: o.label, active: ui.type === o.type })),
          { id: "straight", label: `Straight #${ui.num}`, active: ui.type === "straight" },
        ],
      },
    ],
    picker: ui.type !== "straight" ? undefined : {
      id: "num",
      label: "Straight up 35:1 (click a number)",
      count: 37,
      first: 0,
      cols: 13,
      selected: [...new Set(ui.slip.filter((b) => b.type === "straight").map((b) => b.number as number))],
    },
    buttons: [
      { id: "place", label: "Place bet" },
      { id: "spin", label: "Spin", primary: true, disabled: ui.slip.length === 0 },
      { id: "undo", label: "Undo", disabled: ui.slip.length === 0 },
      { id: "clear", label: "Clear", tone: "danger", disabled: ui.slip.length === 0 },
    ],
    hint: "Even chances 1:1 · dozens, columns 2:1 · straight 35:1",
  };
}

export function Controller() {
  const g = useGameController("roulette");
  const ui = useRef<Ui>({ slip: [], type: "red", num: 0 });
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    g.setBar(barFor(ui.current));
    g.setView({ spinning: false, winning: null } satisfies View);
    return () => {
      alive.current = false;
    };
  }, [g]);

  const publish = (status?: string) => g.update(barFor(ui.current, status));

  function place(type: BetType) {
    const amount = Math.floor(g.bet());
    if (amount < 1) return;
    ui.current.slip = [...ui.current.slip, { type, amount, number: type === "straight" ? ui.current.num : undefined }];
    g.clearMessage();
    publish();
  }

  async function spin() {
    const slip = ui.current.slip;
    if (slip.length === 0) return;
    if (!g.user()) {
      g.message("info", "Log in to place a bet");
      return;
    }
    const total = slip.reduce((s, b) => s + b.amount, 0);
    if (total > g.balance()) {
      g.message("lose", "Not enough balance for that slip");
      return;
    }
    g.setBusy(true);
    g.clearMessage();
    g.setView({ spinning: true, winning: null } satisfies View);
    const res = await g.request<SpinResponse>("POST", { bets: slip });
    if (!res.ok || typeof res.data.spin !== "number") {
      const err = res.data.error || "Something went wrong";
      g.toast("lose", err);
      if (!alive.current) return;
      g.setView({ spinning: false, winning: null } satisfies View);
      g.setBusy(false);
      g.message("lose", err);
      return;
    }
    const d = res.data;
    // The wheel tweens to the real pocket; the result line waits for it to land (the 2D page waits the same 2.6s).
    if (alive.current) g.setView({ spinning: true, winning: d.spin } satisfies View);
    await sleep(2600);
    const sign = d.net >= 0 ? "+" : "-";
    g.toast(d.net >= 0 ? "win" : "lose", `${sign}${money(Math.abs(d.net))}`);
    g.refresh();
    if (!alive.current) return;
    ui.current.slip = [];
    g.setView({ spinning: false, winning: d.spin } satisfies View);
    g.setBusy(false);
    g.message(d.net >= 0 ? "win" : "lose", `${d.spin} ${numColor(d.spin)} — ${sign}${money(Math.abs(d.net))}`);
    publish(d.results.map((r) => `${betLabel(r)} ${r.win ? `+${money(r.payout - r.amount)}` : `-${money(r.amount)}`}`).join(" · "));
    if (d.results.some((r) => r.win && r.type === "straight")) g.celebrate();
  }

  useActionHandler((id) => {
    const [head, rest] = id.split(":");
    if (head === "type") {
      const type = rest as BetType;
      if (type === ui.current.type) place(type);
      else {
        ui.current.type = type;
        publish();
      }
    } else if (head === "num") {
      ui.current.num = Number(rest);
      ui.current.type = "straight";
      place("straight");
    } else if (id === "place") place(ui.current.type);
    else if (id === "undo") {
      ui.current.slip = ui.current.slip.slice(0, -1);
      publish();
    } else if (id === "clear") {
      ui.current.slip = [];
      g.clearMessage();
      publish();
    } else if (id === "spin") void spin();
  });

  return null;
}

/* ------------------------------ Canvas side: 3D ------------------------------ */

/** The existing roulette wheel + ball, shrunk onto the wheel pedestal at the back of the felt and tilted toward the player. */
export function Stage() {
  const view = useGameView<View>();
  return (
    <group position={[0, 0.875 + 0.12, -0.42]} rotation={[0.28, 0, 0]} scale={0.33}>
      <RouletteScene3D base={false} spinning={view?.spinning ?? false} winningNumber={view?.winning ?? null} />
    </group>
  );
}
