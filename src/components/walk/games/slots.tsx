"use client";

import { useEffect, useRef } from "react";
import { getSlotMachine, requestSpin, type ServerOutcome } from "../slotMachines";
import { onSlotSettled } from "../slotPlay";
import { useActionHandler, useGameController } from "./useGameController";
import type { Vec3 } from "./bridge";

/** Sat on the stool; the reels (local 0, 1.545, 0.1) fill the middle of the view. The reels themselves live in the station model. */
export const camera: { eye: Vec3; target: Vec3 } = { eye: [0, 1.64, 1.1], target: [0, 1.53, 0.1] };

const money = (n: number) => `$${n.toLocaleString()}`;

export function Controller() {
  const g = useGameController("slots");

  // The stake of the round in flight, so the result line can say what was won or lost.
  const round = useRef({ bet: 0 });

  useEffect(() => {
    g.setBar({
      bet: true,
      buttons: [{ id: "spin", label: "Spin", primary: true }],
      hint: "Esc or W A S D to step away",
    });
    // When the last reel stops: reveal the result, move the balance, celebrate.
    const off = onSlotSettled((_id, result) => {
      g.setBusy(false);
      if (result.source !== "server") return;
      if (result.jackpotWon > 0) {
        g.message("win", `JACKPOT! +${money(result.payout)}`);
        g.toast("win", `JACKPOT +${money(result.payout)}`);
        g.celebrate();
      } else if (result.win) {
        const net = result.payout - round.current.bet;
        g.message("win", `Winner! +${money(net)}`);
        g.toast("win", `+${money(net)}`);
        g.celebrate();
      } else {
        g.message("lose", `No match  -${money(round.current.bet)}`);
        g.toast("lose", `-${money(round.current.bet)}`);
      }
      g.refresh();
    });
    return off;
  }, [g]);

  useActionHandler(async (id) => {
    if (id !== "spin") return;
    const machine = getSlotMachine("slots");
    if (!machine) return;
    const u = g.user();
    if (!u) {
      g.message("info", "Log in to place a bet");
      g.toast("info", "Log in to play");
      return;
    }
    const bet = Math.floor(g.bet());
    if (bet < 1 || bet > u.money) {
      g.message("lose", "Not enough balance for that bet");
      return;
    }
    g.setBusy(true);
    g.clearMessage();
    const res = await g.request<ServerOutcome & { error?: string }>("POST", { bet });
    if (!res.ok || !Array.isArray(res.data.reels)) {
      g.setBusy(false);
      g.message("lose", res.data.error || "The machine jammed, try again");
      return;
    }
    round.current.bet = bet;
    if (!requestSpin(machine, undefined, res.data)) {
      // Reels were still moving; the bet is already placed, so just resync the balance.
      g.setBusy(false);
      g.refresh();
    }
  });

  return null;
}
